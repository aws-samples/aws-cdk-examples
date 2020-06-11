import { promisify } from 'util';
import * as axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import { APIGatewayEvent } from 'aws-lambda';
import { Handler, APIEventResponse } from './handler';
import * as util from './util';
import * as qs from 'qs';
import { User } from './entities/user';
import * as AWS from 'aws-sdk';
import { Database } from './database';

const db = new Database(new AWS.DynamoDB(), util.getEnv('USER_TABLE'));

/**
 * Request to verify claims.
 */
export interface ClaimVerifyRequest {
    readonly token?: string;
}

/**
 * Response from claim verification.
 */
export interface ClaimVerifyResult {
    readonly userName: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly clientId: string;
    readonly isValid: boolean;
    readonly error?: any;
    readonly email: string;
}

/**
 * JWT token header.
 */
interface TokenHeader {
    kid: string;
    alg: string;
}

/**
 * JWT public key.
 */
interface PublicKey {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
}

/**
 * JWT public key meta data.
 */
interface PublicKeyMeta {
    instance: PublicKey;
    pem: string;
}

/**
 * JWT keys.
 */
interface PublicKeys {
    keys: PublicKey[];
}

/**
 * Map key id to public key.
 */
interface MapOfKidToPublicKey {
    [key: string]: PublicKeyMeta;
}

/**
 * A claim.
 */
interface Claim {
    token_use: string;
    auth_time: number;
    iss: string;
    exp: number;
    username: string;
    client_id: string;
    family_name: string;
    given_name: string;
    email: string;
}

const region = util.getEnv('COGNITO_REGION');
const cognitoPoolId = util.getEnv('COGNITO_POOL_ID');

const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${cognitoPoolId}`;

let cacheKeys: MapOfKidToPublicKey | undefined;
const getPublicKeys = async (): Promise<MapOfKidToPublicKey> => {
    if (!cacheKeys) {
        const url = `${cognitoIssuer}/.well-known/jwks.json`;
        const publicKeys = await axios.default.get<PublicKeys>(url);
        cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
            const pem = jwkToPem(current as any);
            agg[current.kid] = { instance: current, pem };
            return agg;
        }, {} as MapOfKidToPublicKey);
        return cacheKeys;
    } else {
        return cacheKeys;
    }
};

const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

/**
 * Verify the JWT token.
 */
export const verify = async (token: string): Promise<ClaimVerifyResult> => {
    let result: ClaimVerifyResult;
    try {
        const tokenSections = token.split('.');
        if (tokenSections.length < 2) {
            throw new Error('requested token is invalid');
        }
        const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
        const header = JSON.parse(headerJSON) as TokenHeader;
        const keys = await getPublicKeys();
        const key = keys[header.kid];
        if (key === undefined) {
            throw new Error('claim made for unknown kid');
        }
        const claim = await verifyPromised(token, key.pem) as Claim;
        
        console.info({claim});
        
        const currentSeconds = Math.floor((new Date()).valueOf() / 1000);
        if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
            throw new Error('claim is expired or invalid');
        }
        if (claim.iss !== cognitoIssuer) {
            throw new Error('claim issuer is invalid');
        }
        if (claim.token_use !== 'access') {
            throw new Error('claim use is not access');
        }
        console.log(`claim confirmed for ${claim.username}`);

        result = {
            userName: claim.username,
            clientId: claim.client_id,
            isValid: true,
            firstName: claim.given_name,
            lastName: claim.family_name,
            email: claim.email
        };
    } catch (error) {
        result = {
            userName: '',
            clientId: '',
            error,
            isValid: false,
            firstName: '',
            lastName: '',
            email: ''
        };
    }
    return result;
};

/**
 * Get the token for the code and verify it.
 * 
 * Also refreshes an expired token.
 */
export class DecodeVerifyJwtGetHandler extends Handler {

    constructor() {
        super(db);
    }

    /**
     * The event handler.
     */
    public async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            const redirectUri = util.getEnv('COGNITO_REDIRECT_URI');
            const cognitoDomainPrefix = util.getEnv('COGNITO_DOMAIN_PREFIX');
            const cognitoClientId = util.getEnv('COGNITO_APP_CLIENT_ID');
            const cognitoRegion = util.getEnv('COGNITO_REGION');

            const tokenEndpoint = 
                `https://${cognitoDomainPrefix}.auth.${cognitoRegion}.` + 
                `amazoncognito.com/oauth2/token`;

            console.log(`tokenEndpoint: ${tokenEndpoint}`);

            if (!event.queryStringParameters) {
                 return this.failure(null, 400, 'Missing code query string parameter');
            }

            const code = event.queryStringParameters.code;
            const refresh = event.queryStringParameters.refresh;

            let postData: any;

            if (code) {

                console.log(`Verifying ${code}`);

                postData = {
                    grant_type: 'authorization_code',
                    client_id: cognitoClientId,
                    code,
                    redirect_uri: redirectUri
                };
            } else {

                if (!refresh) {
                    return this.failure(null, 401, 'No refresh token');
                }

                console.log('Refreshing: ' + refresh);

                postData = {
                    grant_type: 'refresh_token',
                    client_id: cognitoClientId,
                    refresh_token: refresh
                };
            }

            // Call the Cognito TOKEN endpoint
            const resp = await axios.default({
                method: 'post',
                url: tokenEndpoint,
                data: qs.stringify(postData),
                headers: {
                    'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
                }
            });

            console.log(`token endpoint response: ${JSON.stringify(resp.data, null, 0)}`);

            const token = resp.data;

            // Verify the token
            const result = await verify(token.access_token);
            
            console.info('verify result: ', result);
            
            if (!result.isValid) {
                return this.failure(result.error, 500, 'Token validation failed');
            }
            
            if (!result.userName) {
                return this.failure(null, 500, 'Missing userName');
            }

            // With federated access, this might be the first time we've
            // seen this user. Save a new user record, or record the last login time.
            let user = await this.db.userGetByUsername(result.userName);
            if (!user) {
                // This is a first time login
                console.log(`First time login for ${result.userName}`);

                // Save the user
                user = {
                    emailAddress: result.email || result.userName + '@example.com',
                    username: result.userName,
                    firstName: result.firstName || result.userName,
                    lastName: result.lastName || result.userName
                } as User;

                const userId = await this.db.userSave(user);

                console.log(`Created user ${userId} for ${result.userName}`);

            } else {
                // Returning user
                console.log(`Returning user ${result.userName}`);

            }

            console.log(`verify result: ${JSON.stringify(result, null, 0)}`);

            if (result.isValid) {

                const retval = {
                    idToken: token.id_token,
                    refreshToken: token.refresh_token || refresh, // Only code gives us refresh
                    username: result.userName,
                    expiresIn: token.expires_in
                };
                return this.success(retval);
            } else {
                return this.failure(null, 400, result.error);
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
    const h = new DecodeVerifyJwtGetHandler();
    return h.handle(event);
};