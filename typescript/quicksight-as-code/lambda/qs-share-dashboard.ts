import { QuickSightClient, UpdateDashboardPermissionsCommand } from '@aws-sdk/client-quicksight';

import { CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';

const client = new QuickSightClient({});
// Creating a new QuickSightClient instance

export const shareDashboard = async (event: CdkCustomResourceEvent): Promise<CdkCustomResourceResponse> => {
    // Defining an asynchronous function to share a dashboard
    // It takes a CDK custom resource event

    console.debug('Received event:', event);
    // Logging the received event

    const { DashboardId, AwsAccountId, Region, RequestType } = event.ResourceProperties;
    // Destructuring the necessary properties from the event's resource properties

    // Check if the request is for deletion
    if (RequestType === 'Delete') {
        console.debug('Stack is being deleted, skipping execution.');
        return {
            status: 'SUCCESS',
            data: {},
        };
    }

    try {
        console.info('Sharing dashboard:', DashboardId);
        
        const command = new UpdateDashboardPermissionsCommand({
            DashboardId,
            AwsAccountId,
            GrantLinkPermissions: [{
                Principal: `arn:aws:quicksight:${Region}:${AwsAccountId}:namespace/default`,
                // Constructing the principal ARN for the permissions grant
                Actions: [
                    'quicksight:DescribeDashboard',
                    'quicksight:ListDashboardVersions',
                    'quicksight:QueryDashboard',
                    // Specifying the actions that are permitted on the dashboard
                ],
            }],
        });
        // Creating a new UpdateDashboardPermissionsCommand to update the dashboard's permissions

        const response = await client.send(command);
        // Sending the command to QuickSight and awaiting the response

        console.debug('Generated response:', response);
        console.info(`Successfully shared dashboard ${DashboardId}`);
        
        return {
            status: 'SUCCESS',
            data: response,
        };
    } catch (e) {
        console.error(e);
        
        let reason = 'Internal Server Error';
        // Default error reason

        if (e instanceof Error) {
            reason = e.message;
            // If the error is an instance of Error, use its message as the reason
        }

        return {
            status: 'FAILED',
            reason,
        };
    }
};
