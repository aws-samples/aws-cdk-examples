import * as util from '../lambda/util';
import * as axios from 'axios';
import { User } from '../lambda/entities/user';
import * as uuid from 'uuid';
import * as AWS from 'aws-sdk';
import { APIGatewayEvent, APIGatewayEventDefaultAuthorizerContext } from 'aws-lambda';
import { CognitoIdpStackProps } from '../lib/cognito-idp-stack';

// To run the lambda handlers locally, we need to simulate the environment 
// variables that will be set when the lambda function is created.

// tslint:disable-next-line: no-var-requires
const config:CognitoIdpStackProps = require('../config/env-local.json');
process.env.FACEBOOK_APP_ID = config.facebookAppId;
process.env.FACEBOOK_VERSION = config.facebookApiVersion;
process.env.FACEBOOK_SECRET_ARN = config.facebookSecretArn;
process.env.WEB_DOMAIN = config.webDomainName;
process.env.API_DOMAIN = config.apiDomainName;
process.env.WEB_CERTIFICATE_ARN = config.webCertificateArn;
process.env.API_CERTIFICATE_ARN = config.apiCertificateArn;
process.env.COGNITO_REDIRECT_URI = config.cognitoRedirectUri;
process.env.COGNITO_POOL_ID = config.cognitoPoolId;
process.env.COGNITO_DOMAIN_PREFIX = config.cognitoDomainPrefix;
process.env.COGNITO_APP_CLIENT_ID = config.cognitoAppClientId;
process.env.COGNITO_REGION = config.cognitoRegion;
process.env.USER_TABLE = config.userTable;
process.env.JWT = config.jwt;

const apiUrl = `https://${config.apiDomainName}`;

// Suppress console.error from lambda handler code
util.Log.IsTest = true;

// These imports have to come after creating environment variables
import * as usersGet from '../lambda/users-get';
import * as userByUsernameGet from '../lambda/userbyusername-get';
import * as userGet from '../lambda/user-get';
import * as userPost from '../lambda/user-post';
import * as userDelete from '../lambda/user-delete';

/**
 * Make an authenticated API call to the API, using the JWT env var.
 */
const aapi = async (path: string, verb: string = 'get', data?: any) => {
    return await axios.default({
        method: verb,
        url: apiUrl + "/" + path,
        data,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + config.jwt
        }
    } as any);
};

/**
 * Make an unauthenticated API call to the API.
 */
const uapi = async (path: string, verb: string = 'get', data?: any) => {
    return await axios.default({
        method: verb,
        url: apiUrl + "/" + path,
        data,
        headers: {
            'Content-Type': 'application/json'
        }
    } as any);
};

/**
 * Create an api gateway event for local testing of lambda handlers.
 */
const createEvent = (
    data?: any,
    pathParameters?: any,
    queryStringParameters?: any): APIGatewayEvent => {

    const retval = {
        requestContext: {
            authorizer: {
                claims: {
                    'cognito:username': 'admin'
                }
            }
        } as APIGatewayEventDefaultAuthorizerContext,
        body: JSON.stringify(data),
        pathParameters,
        queryStringParameters,
        headers: {}
    } as APIGatewayEvent;

    return retval;
};

/**
 * Handle a response from a local lambda handler so that it acts like 
 * a REST API call to API Gateway.
 */
const convert = (resp: any): any => {
    if (resp.statusCode >= 300) {
        throw Error(resp.body);
    }
    return { data: JSON.parse(resp.body) };
};

/**
 * This class contains tests that can run either against the actual deployed
 * REST API, or semi-locally by calling lambda handler code directly. It still
 * results in database calls to your account.
 */
export class ApiHandlerTests {

    constructor(private isLocal: boolean) { }

    /**
     * Test user functions.
     */
    public async users() {

        // axios.interceptors.request.use(request => {
        //     console.log('Starting Request', request)
        //     return request
        // })

        // axios.interceptors.response.use(response => {
        //     console.log('Response:', response)
        //     return response
        // })

        let resp: any;

        try {
            // GET /users
            if (this.isLocal) {
                resp = convert(await usersGet.handler(createEvent()));
            } else {
                resp = await aapi('users');
            }
            const users = resp.data;
            expect(users).toBeDefined();
            expect(users).toBeInstanceOf(Array);
        } catch (ex) {
            console.error(ex);
            throw ex;
        }

        let user;

        try {
            // GET /userbyusername/{username}
            if (this.isLocal) {
                resp = convert(await userByUsernameGet.handler(
                    createEvent(null, { username: 'admin' })));
            } else {
                resp = await aapi('userbyusername/admin');
            }
            user = resp.data;
            expect(user).toBeDefined();
            expect(user.username).toEqual('admin');

            // GET /user/{userId}
            if (this.isLocal) {
                resp = convert(await userGet.handler(
                    createEvent(null, { userId: user.id })));
            } else {
                resp = await aapi('user/' + user.id);
            }
            user = resp.data;
            expect(user).toBeDefined();
            expect(user.username).toEqual('admin');

        } catch (ex) {
            console.error(ex);
            throw ex;
        }

        let newUserId: string;
        try {

            // Create a user
            const testId = uuid.v4();
            user = {
                'firstName': 'testnewF-' + testId,
                'lastName': 'testnewL-' + testId,
                'username': 'testnewU-' + testId,
                'emailAddress': 'test' + testId + '@example.com'
            } as User;

            if (this.isLocal) {
                resp = convert(await userPost.handler(createEvent(user)));
            } else {
                resp = await aapi('user', 'post', user);
            }
            newUserId = resp.data;

            let user2;
            if (this.isLocal) {
                resp = convert(await userGet.handler(createEvent(null, { userId: newUserId })));
            } else {
                resp = await aapi('user/' + newUserId, 'get');
            }
            user2 = resp.data as User;

            expect(user2.username).toEqual(user.username);

        } catch (ex) {
            console.error(ex);
            throw ex;
        }

        // Delete the user
        try {
            if (this.isLocal) {
                resp = convert(await userDelete.handler(createEvent(null, { userId: newUserId })));
            } else {
                resp = await aapi('user/' + newUserId, 'delete');
            }
            expect(resp.data).toBeTruthy();

        } catch (ex) {
            console.error(ex);
            throw ex;
        }

        let getDeletedThrewError = false;
        try {
            // Trying to retrieve the user should fail
            if (this.isLocal) {
                resp = convert(await userGet.handler(createEvent(null, { userId: newUserId })));
            } else {
                resp = await aapi('user/' + newUserId, 'get');
            }
        } catch (ex) {
            getDeletedThrewError = true;
        }

        expect(getDeletedThrewError).toBeTruthy();


    }



}