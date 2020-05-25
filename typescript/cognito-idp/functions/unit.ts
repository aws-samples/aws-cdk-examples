import { APIGatewayEvent } from 'aws-lambda';
import { Handler } from './handler';
import * as AWS from 'aws-sdk';
import { APIEventResponse } from './handler';

/**
 * Simple handler for unit testing. Doesn't actually do anything with AWS.
 */
class UnitHandler extends Handler {

    constructor() {
        super();
    }

    /**
     * The event handler.
     */
    async handle(event: APIGatewayEvent): Promise<APIEventResponse> {

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