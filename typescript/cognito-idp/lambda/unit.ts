import { APIGatewayEvent } from 'aws-lambda';
import { Handler, APIEventResponse } from './handler';
import * as AWS from 'aws-sdk';
import { Database } from '../lambda/database';

/**
 * Simple handler for unit testing. Doesn't actually do anything with AWS.
 */
class UnitHandler extends Handler {

    constructor() {
        super(new Database(new AWS.DynamoDB(), 'N/A'));
    }

    /**
     * The event handler.
     */
    public async handle(event: APIGatewayEvent): Promise<APIEventResponse> {

        try {
            if (event.path === 'succeed') {
                return this.success('Ok');
            } else {
                throw Error('fail');
            }
        } catch (ex) {
            return this.failure(ex);
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: APIGatewayEvent) => {
    const h = new UnitHandler();
    return h.handle(event);
};