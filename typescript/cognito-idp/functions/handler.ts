import { Database } from './database';
import * as AWS from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';
import { User } from './entities/user';
import { Log } from './util';

export class APIEventResponse {
    statusCode: number;
    headers: any;
    body: string;
}

/**
 * All lambda handlers use this class.
 */
// tslint:disable-next-line: max-classes-per-file
export abstract class Handler {

    /**
     * Database access, such as dynamo and s3.
     */
    db:Database;

    /**
     * The lambda handler function.
     */
    abstract handle(event:APIGatewayEvent): Promise<APIEventResponse>;
    
    constructor() {
        this.db = new Database(new AWS.DynamoDB());
    }

    /**
     * Standard API Gateway successful response.
     */
    success(resp: any) {
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
    failure(ex: any, statusCode?: number, msg?: string) {

        if (!statusCode) {
            statusCode = 500;
        }

        if (!msg) {
            msg = 'System Error';
        }

        Log.Error(`${statusCode}: ${msg}\n${ex}`);

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
    async getLoggedInUser(event:APIGatewayEvent): Promise<User | null> {

        const claims = event.requestContext?.authorizer?.claims;

        if (!claims) {
            throw new Error('Missing claims from event');
        }
        
        console.info({claims});

        /*
        
        Cognito
        {
            at_hash: '',
            sub: '',
            email_verified: 'true',
            iss: '',
            phone_number_verified: 'true',
            'cognito:username': 'ezbeard',
            aud: '',
            token_use: 'id',
            auth_time: '1588117682',
            phone_number: '+',
            exp: 'Wed Apr 29 00:48:02 UTC 2020',
            iat: 'Tue Apr 28 23:48:02 UTC 2020',
            email: ''
        }
        
        Federate
         claims: {
                at_hash: '',
                sub: '',
                'cognito:groups': 'us-west-2_DA5E8oKIx_AmazonFederate',
                iss: 'https://cognito-idp.us-west-2.amazonaws.com/us-west-2_DA5E8oKIx',
                'cognito:username': 'AmazonFederate_ezbeard',
                given_name: 'Eric',
                nonce: '',
                aud: '',
                identities: '{"dateCreated":"1588781152202","userId":"ezbeard","providerName":"AmazonFederate","providerType":"OIDC","issuer":null,"primary":"true"}',
                token_use: 'id',
                auth_time: '1588781180',
                exp: 'Wed May 06 17:06:20 UTC 2020',
                iat: 'Wed May 06 16:06:20 UTC 2020',
                family_name: 'Beard',
                email: 'ezbeard@amazon.com'
              }
            }
        */
        
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

}