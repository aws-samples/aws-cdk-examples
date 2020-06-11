import { APIGatewayEvent } from 'aws-lambda';
import { Handler, APIEventResponse } from './handler';
import * as AWS from 'aws-sdk';
import * as util from './util';
import { Database } from './database';

const db = new Database(new AWS.DynamoDB(), util.getEnv('USER_TABLE'));


/**
 * GET /userbyusername/{username}
 */
class UserByUsernameHandler extends Handler {

    constructor() {
        super(db);
    }

    /**
     * The event handler.
     */
    public async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            const username = event?.pathParameters?.username;

            if (!username) {
                return this.failure(null, 400, 'No username provided');
            }

            // Make sure user is logged in as super user
            if (!this.isSuperAdmin(event)) {
                return this.failure(null, 403, 'Not authorized!');
            }

            const user = await this.db.userGetByUsername(username);

            return this.success(user);

        } catch (ex) {
            return this.failure(ex);
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: APIGatewayEvent) => {
    const h = new UserByUsernameHandler();
    return h.handle(event);
};