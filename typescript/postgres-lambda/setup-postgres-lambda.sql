-- SQL script to set up PostgreSQL to call Lambda
-- Replace <AWS_REGION> with your AWS region (e.g., us-east-1)
-- Replace <POSTGRES_FUNCTION_NAME> with the name of your Lambda function

-- Create the aws_lambda extension
CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;

-- Create a function to process data using Lambda
CREATE OR REPLACE FUNCTION process_data(data JSONB)
RETURNS JSONB AS $$
SELECT payload FROM aws_lambda.invoke(
  aws_commons.create_lambda_function_arn('<POSTGRES_FUNCTION_NAME>', '<AWS_REGION>'),
  json_build_object('action', 'process', 'data', data)::text,
  'Event'
);
$$ LANGUAGE SQL;

-- Create a function to transform data using Lambda
CREATE OR REPLACE FUNCTION transform_data(data JSONB)
RETURNS JSONB AS $$
SELECT payload FROM aws_lambda.invoke(
  aws_commons.create_lambda_function_arn('<POSTGRES_FUNCTION_NAME>', '<AWS_REGION>'),
  json_build_object('action', 'transform', 'data', data)::text,
  'Event'
);
$$ LANGUAGE SQL;

-- Create a function to validate data using Lambda
CREATE OR REPLACE FUNCTION validate_data(data JSONB)
RETURNS JSONB AS $$
SELECT payload FROM aws_lambda.invoke(
  aws_commons.create_lambda_function_arn('<POSTGRES_FUNCTION_NAME>', '<AWS_REGION>'),
  json_build_object('action', 'validate', 'data', data)::text,
  'Event'
);
$$ LANGUAGE SQL;

-- Test the functions
SELECT process_data('{"id": 123, "value": "test"}'::JSONB);
SELECT transform_data('{"id": 456, "value": "hello world"}'::JSONB);
SELECT validate_data('{"id": 789, "value": "valid data"}'::JSONB);
