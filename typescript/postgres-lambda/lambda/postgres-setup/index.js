const { Client } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

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

async function sendResponse(event, status, reason) {
  const response = {
    Status: status,
    Reason: reason,
    PhysicalResourceId: 'postgres-setup-' + Date.now(),
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId
  };

  console.log('Response:', JSON.stringify(response, null, 2));

  const fetch = (await import('node-fetch')).default;
  await fetch(event.ResponseURL, {
    method: 'PUT',
    headers: { 'Content-Type': '' },
    body: JSON.stringify(response)
  });

  return response;
}
