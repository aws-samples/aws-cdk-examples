const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const response = require('cfn-response');

const secretsManager = new SecretsManagerClient();

/**
 * Lambda function to set up PostgreSQL with AWS Lambda integration
 * This function is called by a CloudFormation Custom Resource
 */
exports.handler = async (event, context) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify({
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    awsRequestId: context.awsRequestId,
    logGroupName: context.logGroupName,
    logStreamName: context.logStreamName,
    remainingTimeMs: context.getRemainingTimeInMillis()
  }, null, 2));

  // Handle delete event
  if (event.RequestType === 'Delete') {
    console.log('Delete request received - no action needed for cleanup');
    return response.send(event, context, response.SUCCESS, {}, 'postgres-setup-delete');
  }

  try {
    // Get environment variables
    const { DB_SECRET_ARN, DB_NAME, POSTGRES_FUNCTION_NAME, AWS_REGION } = process.env;
    console.log('Environment variables:', JSON.stringify({
      DB_SECRET_ARN,
      DB_NAME,
      POSTGRES_FUNCTION_NAME,
      AWS_REGION
    }, null, 2));

    // Get database credentials from Secrets Manager
    console.log(`Retrieving secret from ${DB_SECRET_ARN}`);
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: DB_SECRET_ARN })
    );
    
    if (!secretResponse.SecretString) {
      throw new Error('Secret string is empty or undefined');
    }
    
    const secret = JSON.parse(secretResponse.SecretString);
    console.log('Secret retrieved successfully. Host:', secret.host);

    // Create PostgreSQL client
    console.log(`Connecting to PostgreSQL database ${DB_NAME} at ${secret.host}:${secret.port}`);
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: DB_NAME,
      user: secret.username,
      password: secret.password,
      ssl: { rejectUnauthorized: false },
      // Add connection timeout for better error handling
      connectionTimeoutMillis: 10000
    });

    // Connect to the database
    console.log('Attempting to connect to PostgreSQL...');
    await client.connect();
    console.log('Successfully connected to PostgreSQL');

    // Prepare setup SQL
    console.log('Preparing SQL setup script');
    const lambdaArn = `aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}')`;
    console.log(`Using Lambda ARN expression: ${lambdaArn}`);
    
    const setupSQL = `
      -- Create aws_lambda extension if it doesn't exist
      CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;
      
      -- Create function to process data
      CREATE OR REPLACE FUNCTION process_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'process', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;

      -- Create function to transform data
      CREATE OR REPLACE FUNCTION transform_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'transform', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;

      -- Create function to validate data
      CREATE OR REPLACE FUNCTION validate_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'validate', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;
    `;

    // Execute setup SQL
    console.log('Executing SQL setup script...');
    const result = await client.query(setupSQL);
    console.log('SQL setup script executed successfully:', JSON.stringify(result));
    
    // Verify the functions were created
    console.log('Verifying SQL functions were created...');
    const verifyResult = await client.query(`
      SELECT proname, proargtypes, prosrc 
      FROM pg_proc 
      WHERE proname IN ('process_data', 'transform_data', 'validate_data')
    `);
    console.log(`Found ${verifyResult.rows.length} functions:`, JSON.stringify(verifyResult.rows.map(row => row.proname)));
    
    // Close the database connection
    console.log('Closing PostgreSQL connection');
    await client.end();
    console.log('PostgreSQL connection closed successfully');

    // Send success response
    console.log('Sending SUCCESS response to CloudFormation');
    return response.send(event, context, response.SUCCESS, {
      Message: 'PostgreSQL setup completed successfully',
      FunctionsCreated: verifyResult.rows.length,
      LambdaFunction: POSTGRES_FUNCTION_NAME,
      Region: AWS_REGION
    }, 'postgres-setup-' + Date.now());

  } catch (error) {
    console.error('Error during PostgreSQL setup:', error);
    console.error('Stack trace:', error.stack);
    return response.send(event, context, response.FAILED, {
      Error: error.message,
      ErrorType: error.name,
      StackTrace: error.stack
    });
  }
};
