import { APIGatewayEvent } from 'aws-lambda';
import { Handler, APIEventResponse } from './handler';
import * as AWS from 'aws-sdk';
import * as util from './util';
import { Database } from './database';

const db = new Database(new AWS.DynamoDB(), util.getEnv('USER_TABLE'));

/**
 * GET /user/{userId}
 */
class UserGetHandler extends Handler {

    constructor() {
        super(db);
    }

    /**
     * The event handler.
     */
    public async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            const userId = event.pathParameters?.userId;

            if (!userId) {
                return this.failure(null, 400, 'No userId provided');
            }

            // Make sure user is logged in as super user
            if (!this.isSuperAdmin(event)) {
                return this.failure(null, 403, 'Not authorized!');
            }

            const user = await this.db.userGet(userId);

            if (!user) {
                return this.failure(null, 404, 'No such user');
            }

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
    const h = new UserGetHandler();
    return h.handle(event);
};