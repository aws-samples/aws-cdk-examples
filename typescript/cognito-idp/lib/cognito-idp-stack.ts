import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as util from '../functions/util';
import * as cognito from '@aws-cdk/aws-cognito';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { StaticSite } from './static-site';
import { AuthorizationType } from "@aws-cdk/aws-apigateway";
import { ResourceHandlerProps } from './resource-handler-props';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';
import { CognitoRestApiProps, CognitoRestApi } from './cognito-rest-api';
import * as cr from '@aws-cdk/custom-resources';
import { UserPoolClientIdentityProvider } from '@aws-cdk/aws-cognito';

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

        // Read local environment variables from .env
        const region = util.getEnv('AWS_REGION');
        const accountId = util.getEnv('AWS_ACCOUNT');
        const domainName = util.getEnv('WEB_DOMAIN');
        const webCertificateArn = util.getEnv('WEB_CERTIFICATE_ARN');

        // Users Table - Store basic user details we get from Cognito
        const userTable = new dynamodb.Table(this, 'UsersTable', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // Index on username
        userTable.addGlobalSecondaryIndex({
            indexName: 'username-index',
            partitionKey: {
                name: 'username',
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        });

        // Output the name of the user table
        const userTableOut = new cdk.CfnOutput(this, 'UserTableName', {
            value: userTable.tableName,
            exportName: 'CognitoIdpUserTableName',
        });

        // Cognito User Pool
        const userPool = new cognito.UserPool(this, 'CognitoIDPUserPool', {
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

        // Output the User Pool ID
        const userPoolOut = new cdk.CfnOutput(this, 'CognitoIDPUserPoolOut', {
            value: userPool.userPoolId,
            exportName: 'CognitoIDPUserPoolId'
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

        // TODO - Can we do the above in the construct somehow?
        // Did the recent related PR on StandardAttributes solve this?

        // Set up an admin group in the user pool
        const adminsGroup = new cognito.CfnUserPoolGroup(this, "AdminsGroup", {
            userPoolId: userPool.userPoolId
        });

        // We will ask the IDP to redirect back to our domain's index page
        const redirectUri = `https://${domainName}`;

        // Amazon Federate Client Secret
        const secret = secrets.Secret.fromSecretAttributes(this, 'FederateSecret', {
            secretArn: util.getEnv('FACEBOOK_SECRET_ARN'),
        });

        // Facebook IDP

        // L1
        // const fbProviderName = 'Facebook'; // ProviderType must match!
        // const idp = new cognito.CfnUserPoolIdentityProvider(this,
        //     'FacebookIDP', {
        //     providerName: fbProviderName,
        //     providerType: fbProviderName,
        //     userPoolId: userPool.userPoolId,
        //     idpIdentifiers: [],
        //     attributeMapping: {
        //         'email': 'EMAIL',
        //         'given_name': 'GIVEN_NAME',
        //         'family_name': 'FAMILY_NAME'
        //     },
        //     providerDetails: {
        //         client_id: util.getEnv('FACEBOOK_APP_ID'),
        //         client_secret: secret.secretValue,
        //         authorize_scopes: "email" // openid and profile don't work here
        //     }
        // });

        // Beware! Weird things can happen if you have the L1 as above and replace it with the L2.

        // L2
        // 
        const idp = new cognito.UserPoolIdentityProviderFacebook(this, 'FacebookIDP', {
            clientId: util.getEnv('FACEBOOK_APP_ID'),
            clientSecret: secret.secretValue.toString(),
            scopes: ['email'],
            userPool
            // TODO - What about attribute mapping?
        });

        // Configure the user pool client application 

        // // L1
        // const cfnUserPoolClient = new cognito.CfnUserPoolClient(this, "CognitoAppClient", {
        //     supportedIdentityProviders: ["COGNITO", 'Facebook'],
        //     clientName: "Web",
        //     allowedOAuthFlowsUserPoolClient: true,
        //     allowedOAuthFlows: ["code"],
        //     allowedOAuthScopes: ["phone", "email", "openid", "profile"],
        //     generateSecret: false,
        //     refreshTokenValidity: 1,
        //     callbackUrLs: [redirectUri],
        //     logoutUrLs: [redirectUri],
        //     userPoolId: userPool.userPoolId
        // });

        // TODO - We need better docs for this L2

        // L2
        const userPoolClient = new cognito.UserPoolClient(this, 'CognitoAppClient', {
            userPool,
            authFlows: {
                userPassword: true,
                refreshToken: true // TODO - This is required by Cfn, needs validation
                // REFRESH_TOKEN_AUTH should always be allowed. (Service: AWSCognitoIdentityProviderService; Status Code: 400; Error Code: InvalidParameterException; Request ID: 8b17a2ba-89a2-4446-b458-c365ae51b13e)
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true
                },
                scopes: [
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.OPENID
                ],
                callbackUrls: [redirectUri] 
                // TODO - What about logoutUrls?
            },
            generateSecret: false,
            userPoolClientName: 'Web',
            supportedIdentityProviders: [UserPoolClientIdentityProvider.FACEBOOK]
        });

        // Output the User Pool App Client ID
        const userPoolClientOut = new cdk.CfnOutput(this, 'CognitoIDPUserPoolClientOut', {
            value: userPoolClient.userPoolClientId,
            exportName: 'CognitoIDPUserPoolClientId'
        });

        // Make sure the user pool client is created after the IDP
        userPoolClient.node.addDependency(idp);

        // Our cognito domain name
        const cognitoDomainPrefix =
            `${domainName}`.toLowerCase().replace(/[.]/g, "-");

        // Add the domain to the user pool
        userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: cognitoDomainPrefix,
            },
        });

        // Configure the lambda functions and REST API

        /**
         * This function grants access to resources to our lambda functions.
         */
        const g = (f: lambda.Function) => {

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

        // Auth
        const handlers: ResourceHandlerProps[] = [];
        handlers.push(new ResourceHandlerProps('decode-verify-jwt', 'get', false, g));

        // Users
        handlers.push(new ResourceHandlerProps('users', 'get', true, g));
        handlers.push(new ResourceHandlerProps('user/{userId}', 'get', true, g));
        handlers.push(new ResourceHandlerProps('user/{userId}', 'delete', true, g));
        handlers.push(new ResourceHandlerProps('user', 'post', true, g));
        handlers.push(new ResourceHandlerProps('userbyusername/{username}', 'get', true, g));

        // The resource handler can't currently handle something like this:
        //
        // thing/{thingId}/otherThing/{otherId}
        //
        // If you need that, do:
        //
        // thing/{thingId}?otherThing=otherId

        // Create the REST API with an L3 construct included in this example repo.
        // (See cognito-rest-api.ts)
        const api = new CognitoRestApi(this, this.stackName, {
            domainName: util.getEnv('API_DOMAIN'),
            certificateArn: util.getEnv('API_CERTIFICATE_ARN'),
            lambdaFunctionDirectory: './dist/lambda',
            userPool,
            cognitoRedirectUri: `https://${domainName}`,
            cognitoDomainPrefix,
            cognitoAppClientId: userPoolClient.userPoolClientId,
            cognitoRegion: region,
            additionalEnvVars: {
                "USER_TABLE": userTable.tableName
            },
            resourceHandlers: handlers
        });

        // Static web site created by an L3 construct included in this example repo
        // (See static-site.ts)
        const site = new StaticSite(this, 'StaticSite', {
            domainName,
            certificateArn: webCertificateArn,
            contentPath: './dist/web'
        });

        // Create a custom resource that writes out the config file for the web site.
        // (The web site needs deploy-time values, so this fixes some of the chicken 
        // and egg problems with the .env file)
        const onEvent = new lambda.Function(this, 'CreateConfigHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset('./dist/lambda'),
            handler: `create-config.handler`,
            memorySize: 1536,
            timeout: cdk.Duration.minutes(5),
            description: `${this.stackName} Static Site Config`,
            environment: {
                'S3_BUCKET_NAME': site.getBucketName(),
                'API_DOMAIN': util.getEnv('API_DOMAIN'),
                'COGNITO_DOMAIN_PREFIX': cognitoDomainPrefix,
                'COGNITO_REGION': region,
                'COGNITO_APP_CLIENT_ID': userPoolClient.userPoolClientId,
                'COGNITO_REDIRECT_URI': util.getEnv('COGNITO_REDIRECT_URI'),
                'FACEBOOK_APP_ID': util.getEnv('FACEBOOK_APP_ID'),
                'FACEBOOK_VERSION': util.getEnv('FACEBOOK_VERSION')
            }
        });

        site.grantAccessTo(onEvent);

        // Create a provider
        const provider = new cr.Provider(this, 'ConfigFileProvider', {
            onEventHandler: onEvent
        });

        // Create the custom resource
        const customResource = new cdk.CustomResource(this, 'ConfigFileResource', {
            serviceToken: provider.serviceToken, 
            properties: { 
                'FORCE_UPDATE': new Date().toISOString()
            }
        });

        // FORCE_UPDATE forces the custom resource to update the config file on each deploy

        // TODO - Can we set the logical id of the custom resource every time the deployment changes?

        customResource.node.addDependency(site.getDeployment());

    }
}
