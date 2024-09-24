import { EventBridgeEvent, Context } from 'aws-lambda';

export const handler = async (event: EventBridgeEvent<string, any>) => {
    console.log('LogEvent');
    console.log('Received event:', JSON.stringify(event, null, 2));
    return 'Finished';
};
