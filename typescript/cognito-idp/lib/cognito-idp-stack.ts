import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as util from '../functions/util';
import * as cognito from '@aws-cdk/aws-cognito';
import { StaticSite } from './static-site';
import { AuthorizationType } from "@aws-cdk/aws-apigateway";
import { EndpointHandler } from './endpoint-handler';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

require('dotenv').config();

/**
 * This stack contains the following:
 * 
 * - The static site (S3, CloudFront, Route53)
 * - The REST API (Lambda and API Gateway)
 * - Auth (Cognito)
 */
export class CognitoIdpStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Read local environment variables from ./env
        const region = util.getEnv('AWS_REGION');
        const accountId = util.getEnv('AWS_ACCOUNT');
        const domainName = util.getEnv('DOMAIN_NAME');
        const certificateArn = util.getEnv('CERTIFICATE_ARN');

        // Users Table - Store basic user details we get from Cognito
        const userTable = new dynamodb.Table(this, 'UsersTable', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true, 
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // TODO - username-index

        // Output the name of the user table
        const userTableOut = new cdk.CfnOutput(this, 'UserTableName', {
            value: userTable.tableName,
            exportName: 'UserTableName',
        });

        const contentPath = './web';

        // Static web site
        const site = new StaticSite(this, 'StaticSite', {
            domainName,
            certificateArn,
            contentPath
        });

        // Configure options for API Gateway
        const apiOptions = {
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowMethods: apigw.Cors.ALL_METHODS
            },
            loggingLevel: apigw.MethodLoggingLevel.INFO,
            dataTraceEnabled: true
        }


        // Private API - Authenticated calls only
        const api = new apigw.RestApi(this, 'UpvoteAPI-Private', apiOptions);

        // Send CORS headers on expired token OPTIONS requests, 
        // or the browser won't know to refresh.
        //
        // (Note that the header values have to be in nested single quotes.)
        api.addGatewayResponse('ExpiredTokenResponse', {
            responseHeaders: {
                'Access-Control-Allow-Headers':
                    "'Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key'",
                'Access-Control-Allow-Origin': "'*'"
            },
            statusCode: '401',
            type: apigw.ResponseType.EXPIRED_TOKEN
        });

        // Cognito User Pool
        const userPool = new cognito.UserPool(this, 'MyUserPool', {
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
                username: true
            },
            requiredAttributes: {
                email: true,
                givenName: true,
                familyName: true
            }
        });

        // This solves an error that can be very difficult to troubleshoot when using federation.
        // User attributes must be mutable, even though we never change them. When created 
        // via the console, they are mutable, but via Cfn they are not mutable by default.
        const userPoolCfn = userPool.node.defaultChild as cognito.CfnUserPool;
        userPoolCfn.schema = [{
            name: 'email',
            attributeDataType: "String",
            mutable: true,
            required: false,
            stringAttributeConstraints: {
                maxLength: "128"
            }
        }, {
            name: 'given_name',
            attributeDataType: "String",
            mutable: true,
            required: false,
            stringAttributeConstraints: {
                maxLength: "128"
            }
        }, {
            name: 'family_name',
            attributeDataType: "String",
            mutable: true,
            required: false,
            stringAttributeConstraints: {
                maxLength: "128"
            }
        },
        ];

        // Set up an admin group in the user pool
        const adminsGroup = new cognito.CfnUserPoolGroup(this, "AdminsGroup", {
            userPoolId: userPool.userPoolId
        });

        // Create the authorizer for all REST API calls
        const cfnAuthorizer = new apigw.CfnAuthorizer(this, id, {
            name: "CognitoAuthorizer",
            type: AuthorizationType.COGNITO,
            identitySource: "method.request.header.Authorization",
            restApiId: api.restApiId,
            providerArns: [userPool.userPoolArn]
        });

        // We will ask the IDP to redirect back to our domain's index page
        const redirectUri = `https://${domainName}`;

        // Configure the identity provider
        const idpOptions = {};
        // const idp = cognito.UserPoolIdentityProvider.facebook(this, 'FacebookIDP', idpOptions);

        // Configure the user pool client application 
        const cfnUserPoolClient = new cognito.CfnUserPoolClient(this, "CognitoAppClient", {
            supportedIdentityProviders: ["COGNITO", 'FacebookIDP'],
            clientName: "Web",
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthFlows: ["code"],
            allowedOAuthScopes: ["phone", "email", "openid", "profile"],
            generateSecret: false,
            refreshTokenValidity: 1,
            callbackUrLs: [redirectUri],
            logoutUrLs: [redirectUri],
            userPoolId: userPool.userPoolId
        });

        // Make sure the user pool client is created after the IDP
        // cfnUserPoolClient.addDependsOn(idp);

        // Our cognito domain name
        const cognitoDomainPrefix =
            `${domainName}`.toLowerCase().replace(/[.]/g, "-");

        // Add the domain to the user pool
        userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: cognitoDomainPrefix,
            },
        });

        // Set up environment variables for our lambda functions
        const envVars: any = {
            "COGNITO_POOL_ID": userPool.userPoolId,
            "COGNITO_REDIRECT_URI": `https://${domainName}`,
            "COGNITO_DOMAIN_PREFIX": cognitoDomainPrefix,
            "COGNITO_APP_CLIENT_ID": cfnUserPoolClient.ref, // <-- This is how you get the ID
            "COGNITO_REGION": region
        };

        /**
         * This function grants access to resources to our lambda functions.
         */
        const grantAccess = (f: lambda.Function) => {

            // someBucket.grantReadWrite(f);

            const tables = [userTable];

            for (const table of tables) {
                table.grantReadWriteData(f);

                // Give permissions to indexes manually
                f.role?.addToPolicy(new iam.PolicyStatement({
                    actions: ['dynamodb:*'],
                    resources: [`${table.tableArn}/index/*`],
                }));
            }

        }

        const h = new EndpointHandler(this, 
            envVars, grantAccess, api, cfnAuthorizer);

        // Auth
        h.addEndpoint('decode-verify-jwt', 'get', false, );

        // Users
        h.addEndpoint('users', 'get', true);
        h.addEndpoint('user/{userId}', 'get', true);
        h.addEndpoint('user/{userId}', 'delete', true);
        h.addEndpoint('user', 'post', true);
        h.addEndpoint('userbyusername/{username}', 'get', true);

        // The endpoint handler can't currently handle something like this:
        //
        // thing/{thingId}/otherThing/{otherId}
        //
        // If you need that, do:
        //
        // thing/{thingId}?otherThing=otherId

    }
}
