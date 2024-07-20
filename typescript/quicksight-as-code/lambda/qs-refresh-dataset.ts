import { QuickSightClient, CreateIngestionCommand } from '@aws-sdk/client-quicksight';
import { EventBridgeEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = new QuickSightClient({});
// Creating a new QuickSightClient instance

export const refreshDataset = async (event: EventBridgeEvent<string, any>): Promise<void> => {
    // Defining an asynchronous function to refresh the dataset when a Glue ETL job finishes
    // It takes an EventBridge event as input on the successful termination of the Glue ETL job
    // It also receives from the environment a map containing the correspondence of Glue ETL jobs to QuickSight datasets to refresh.
    // This is a map with the key as the sanitized Glue ETL job name, and value as the datasets to refresh, separated by '___'

    console.debug('Received event:', event);
    
    const jobName = event.detail.jobName.replace(/[^a-zA-Z0-9]/g, '_');
    // Sanitizing the jobName from the event to ensure it only contains alphanumeric characters and underscores

    const datasetStrings = process.env[jobName];
    // Retrieving the '___' separated dataset IDs from the environment using the sanitized jobName

    if (datasetStrings === undefined) {
        return;
        // If no dataset string is found, exit the function
    }

    const datasets = datasetStrings.split('___');
    // Splitting the dataset string into an array of dataset IDs

    try {
        for (const datasetId of datasets) {
            // Looping through each dataset ID
            console.info(`Starting to refresh dataset: ${datasetId}`);
            
            const command = new CreateIngestionCommand({
                DataSetId: datasetId,
                IngestionType: "FULL_REFRESH",
                IngestionId: `${datasetId}-${randomUUID()}`,
                AwsAccountId: event.account,
            });
            // Creating a new CreateIngestionCommand to initiate a full refresh for the dataset

            const response = await client.send(command);
            // Sending the command to QuickSight and awaiting the response

            console.debug(`Generated response: ${response}`);
            console.info(`Successfully sent refresh command for dataset: ${datasetId}`);
        }
    } catch (e) {
        console.error(e);
    }
};
