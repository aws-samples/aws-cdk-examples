import { APIGatewayEvent } from 'aws-lambda';
import { Handler, APIEventResponse } from './handler';
import * as AWS from 'aws-sdk';
import { User } from './entities/user';
import * as util from './util';
import { Database } from './database';

const db = new Database(new AWS.DynamoDB(), util.getEnv('USER_TABLE'));

/**
 * GET /users
 */
class UsersGetHandler extends Handler {

    constructor() {
        super(db);
    }

    /**
     * The event handler.
     */
    public async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            // Make sure user is logged in as super user
            if (!this.isSuperAdmin(event)) {
                return this.failure(null, 403, 'Not authorized!');
            }

            // Get the users from the database
            return this.success(await this.db.usersGet());
        } catch (ex) {
            util.Log.Error(ex);
            return this.failure(ex);
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: APIGatewayEvent) => {
    const h = new UsersGetHandler();
    return h.handle(event);
};