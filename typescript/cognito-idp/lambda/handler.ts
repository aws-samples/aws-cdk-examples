import { Database } from './database';
import * as AWS from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';
import { User } from './entities/user';
import * as util from './util';

export class APIEventResponse {
    public statusCode: number;
    public headers: any;
    public body: string;
}

/**
 * All lambda handlers use this class.
 */
// tslint:disable-next-line: max-classes-per-file
export abstract class Handler {

    /**
     * The lambda handler function.
     */
    public abstract handle(event:APIGatewayEvent): Promise<APIEventResponse>;
    
    /**
     * Construct an instance by passing in a ref to the db.
     */
    constructor(protected db:Database) {}

    /**
     * Standard API Gateway successful response.
     */
    public success(resp: any) {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key',
                'Access-Control-Allow-Origin': '*',
                "Access-Control-Allow-Credentials": true
            },
            body: JSON.stringify(resp)
        };
    }

    /**
     * Standard API Gateway failure response.
     */
    public failure(ex: any, statusCode?: number, msg?: string) {

        if (!statusCode) {
            statusCode = 500;
        }

        if (!msg) {
            msg = 'System Error';
        }

        util.Log.Error(`${statusCode}: ${msg}\n${ex}`);

        return {
            statusCode,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key',
                'Access-Control-Allow-Origin': '*',
                "Access-Control-Allow-Credentials": true
            },
            body: `Request Failed: ${msg}\n`
        };
    }

    /**
     * 
     */
    public async getLoggedInUser(event:APIGatewayEvent): Promise<User | null> {

        const claims = event.requestContext?.authorizer?.claims;

        if (!claims) {
            throw new Error('Missing claims from event');
        }
        
        console.info({claims});
        
        let username = claims['cognito:username'] as string;
        username = username.replace('AmazonFederate_', '');

        const user = await this.db.userGetByUsername(username);
        
        if (!user) {
            return null;
        }
        
        // For some reason we don't get the name and email when we validate the token in decode-verify-jwt.
        if (user.emailAddress !== claims.email || user.firstName !== claims.given_name || user.lastName !== claims.family_name) {
            
            console.log('Fixing user info');
            
            // Update anything that changed, ignore anything that is blank
            user.emailAddress = claims.email || user.emailAddress;
            user.firstName = claims.given_name || user.firstName;
            user.lastName = claims.family_name || user.lastName;
            
            await this.db.userSave(user);
        }
        
        return user;
    }

    /**
     * Returns true if the logged in user is a super admin.
     */
    public async isSuperAdmin(event:APIGatewayEvent): Promise<boolean> {
        const loggedInUser = await this.getLoggedInUser(event);
        return loggedInUser?.isSuperAdmin || false;
    }

}