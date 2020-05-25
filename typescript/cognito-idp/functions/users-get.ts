import { APIGatewayEvent } from 'aws-lambda';
import { Handler } from './handler';
import * as AWS from 'aws-sdk';
import { APIEventResponse } from './handler';
import { User } from './entities/user';
import { Log } from './util';

/**
 * GET /users
 */
class UsersGetHandler extends Handler {

    constructor() {
        super();
    }

    /**
     * The event handler.
     */
    async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            // Make sure user is logged in as super user
            if (!this.isSuperAdmin(event)) {
                return this.failure(null, 403, 'Not authorized!');
            }

            // Get the users from the database
            return this.success(await this.db.usersGet());
        } catch (ex) {
            Log.Error(ex);
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