const { Client } = require('pg');
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManager();

/**
 * Lambda function that connects to PostgreSQL and executes a query
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));
  
  try {
    // Get database credentials from Secrets Manager
    const secretArn = process.env.DB_SECRET_ARN;
    const dbName = process.env.DB_NAME;
    
    console.log(`Retrieving secret from ${secretArn}`);
    const secretResponse = await secretsManager.getSecretValue({ SecretId: secretArn });
    const secret = JSON.parse(secretResponse.SecretString);
    
    // Create PostgreSQL client
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: dbName,
      user: secret.username,
      password: secret.password,
      ssl: {
        rejectUnauthorized: false, // For demo purposes only, consider proper SSL setup in production
      },
      connectionTimeoutMillis: 5000,
    });
    
    // Connect to the database
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    
    // Check if our demo table exists, if not create it
    console.log('Creating demo table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_table (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert a record
    const message = event.message || 'Hello from Lambda!';
    console.log(`Inserting message: ${message}`);
    await client.query('INSERT INTO demo_table (message) VALUES ($1)', [message]);
    
    // Query the records
    console.log('Querying records...');
    const result = await client.query('SELECT * FROM demo_table ORDER BY created_at DESC LIMIT 10');
    
    // Close the connection
    await client.end();
    
    // Return the results
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Query executed successfully',
        records: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error executing query',
        error: error.message,
      }),
    };
  }
};
