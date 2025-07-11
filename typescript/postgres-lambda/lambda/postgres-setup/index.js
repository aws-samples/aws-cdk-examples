const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const https = require('https');
const url = require('url');

const secretsManager = new SecretsManagerClient();

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.RequestType === 'Delete') {
    return sendResponse(event, 'SUCCESS', 'Delete operation completed');
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
        json_build_object('action', 'process', 'data', data)::text,
        'Event'
      );
      $$ LANGUAGE SQL;

      CREATE OR REPLACE FUNCTION transform_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'transform', 'data', data)::text,
        'Event'
      );
      $$ LANGUAGE SQL;

      CREATE OR REPLACE FUNCTION validate_data(data JSONB)
      RETURNS JSONB AS $$
      SELECT payload FROM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn('${POSTGRES_FUNCTION_NAME}', '${AWS_REGION}'),
        json_build_object('action', 'validate', 'data', data)::text,
        'Event'
      );
      $$ LANGUAGE SQL;
    `;

    await client.query(setupSQL);
    await client.end();

    return sendResponse(event, 'SUCCESS', 'PostgreSQL setup completed successfully');

  } catch (error) {
    console.error('Error:', error);
    return sendResponse(event, 'FAILED', error.message);
  }
};

function sendResponse(event, status, reason) {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: status,
      Reason: reason,
      PhysicalResourceId: 'postgres-setup-' + Date.now(),
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: {}
    });

    console.log('Response:', responseBody);

    // Parse the URL
    const parsedUrl = url.parse(event.ResponseURL);
    
    // Prepare the request options
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'Content-Type': '',
        'Content-Length': responseBody.length
      }
    };

    // Send the response
    const request = https.request(options, (response) => {
      console.log(`Status code: ${response.statusCode}`);
      resolve({ status, reason });
    });

    request.on('error', (error) => {
      console.error('Error sending response:', error);
      reject(error);
    });

    // Write the response body and end the request
    request.write(responseBody);
    request.end();
  });
}
