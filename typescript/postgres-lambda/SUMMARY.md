# PostgreSQL and Lambda Integration Example - Summary

This CDK example demonstrates the integration between AWS Lambda and Aurora PostgreSQL Serverless v2. It showcases two key integration patterns:

## 1. Lambda to PostgreSQL

The first pattern demonstrates how a Lambda function can connect to and interact with a PostgreSQL database:

- The Lambda function (`LambdaToPostgres`) retrieves database credentials from AWS Secrets Manager
- It establishes a connection to the PostgreSQL database
- It creates a table if it doesn't exist, inserts data, and queries the database
- The function returns the query results

## 2. PostgreSQL to Lambda

The second pattern demonstrates how PostgreSQL can invoke a Lambda function:

- PostgreSQL uses the `aws_lambda` extension to call Lambda functions
- The Lambda function (`PostgresFunction`) receives data from PostgreSQL
- It processes the data based on the action specified in the event
- It returns results that can be used in SQL queries

## Security Features

The example implements several security best practices:

- The database is deployed in a private subnet
- Security groups restrict access to the database
- Credentials are stored in AWS Secrets Manager
- IAM roles limit permissions to only what's necessary

## Helper Scripts

The example includes several helper scripts:

- `test-lambda.sh`: For testing the Lambda functions
- `connect-to-postgres.sh`: For connecting to the PostgreSQL database
- `setup-postgres-lambda.sql`: For setting up the PostgreSQL database to call Lambda

## Deployment

The example can be deployed with standard CDK commands:

```bash
npm install
npm run build
npx cdk deploy
```

After deployment, users need to set up the PostgreSQL database to call Lambda by creating the `aws_lambda` extension and defining functions that invoke Lambda.
