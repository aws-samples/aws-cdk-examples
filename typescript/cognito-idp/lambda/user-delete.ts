import { APIGatewayEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { Handler, APIEventResponse } from './handler';
import * as util from './util';
import { Database } from './database';

const db = new Database(new AWS.DynamoDB(), util.getEnv('USER_TABLE'));

/**
 * DELETE /user/{userId}
 */
class UserDeleteHandler extends Handler {

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
            const loggedInUser = await this.getLoggedInUser(event);
            if (!loggedInUser?.isSuperAdmin) {
                return this.failure(null, 403, 'Not authorized!');
            }

            const user = await this.db.userGet(userId);

            if (!user) {
                return this.failure(null, 400, 'No such user');
            }

            if (user.username === loggedInUser.username) {
                return this.failure(null, 400, 'Cannot delete self');
            }

            // TODO - Um what if there's a person at amazon called admin@ ??
            if (user.username === 'admin') {
                return this.failure(null, 400, 'Cannot delete admin user');
            }

            await this.db.userDelete(userId);

            return this.success(true);

        } catch (ex) {
            return this.failure(ex);
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: APIGatewayEvent) => {
    const h = new UserDeleteHandler();
    return h.handle(event);
};