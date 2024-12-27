// Import necessary modules from AWS SDK v3
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand } = require('@aws-sdk/lib-dynamodb'); // Import PutCommand

// Create a DynamoDB client
const dynamoDBClient = new DynamoDBClient({});

exports.handler = async (event) => {
    const jobId = event.jobId;
    const status = 'Processed'; // Initial job status
    const createdAt = new Date().toISOString(); // Current timestamp

    // Job item to be saved in DynamoDB
    const jobItem = {
        jobId,
        status,
        createdAt,
    };

    const params = {
        TableName: process.env.JOB_TABLE,
        Item: jobItem,
    };

    try {
        // Insert the job into the DynamoDB table
        const command = new PutCommand(params);
        await dynamoDBClient.send(command);

        // Return the jobId to the client immediately
        const response = {
            statusCode: 200,
            body: JSON.stringify({ jobId }),  // Return jobId to the client
        };

        // Return jobId immediately
        return response;
    } catch (error) {
        console.error('Error processing job:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not process job' }),
        };
    }
};
