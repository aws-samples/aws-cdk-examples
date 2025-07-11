const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const response = require('cfn-response');

const secretsManager = new SecretsManagerClient();

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.RequestType === 'Delete') {
    return response.send(event, context, response.SUCCESS, {}, 'postgres-setup-delete');
  }

  try {
    const { DB_SECRET_ARN, DB_NAME, POSTGRES_FUNCTION_NAME, AWS_REGION } = process.env;

    // Get database credentials
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: DB_SECRET_ARN })
    );
    const secret = JSON.parse(secretResponse.SecretString);

    // Connect to PostgreSQL
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: DB_NAME,
      user: secret.username,
      password: secret.password,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Execute setup SQL
    const setupSQL = `
      CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;

      CREATE OR REPLACE FUNCTION process_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'process', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;

      CREATE OR REPLACE FUNCTION transform_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'transform', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;

      CREATE OR REPLACE FUNCTION validate_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'validate', 'data', data)::JSONB,
        'RequestResponse'
      );
      $$ LANGUAGE SQL;
    `;

    await client.query(setupSQL);
    await client.end();

    // Send success response
    return response.send(event, context, response.SUCCESS, {
      Message: 'PostgreSQL setup completed successfully'
    }, 'postgres-setup-' + Date.now());

  } catch (error) {
    console.error('Error:', error);
    return response.send(event, context, response.FAILED, {
      Error: error.message
    });
  }
};
