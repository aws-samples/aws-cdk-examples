import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets/lib';
import { Construct } from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as util from '../lambda/util';
import * as cognito from '@aws-cdk/aws-cognito';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { ResourceHandler } from './resource-handler';
import { ResourceHandlerProps } from './resource-handler-props';
import * as lambda from '@aws-cdk/aws-lambda';

/**
 * Properties needed to configure the static site.
 */
export interface CognitoRestApiProps {
    domainName: string;
    certificateArn: string;
    lambdaFunctionDirectory: string;
    userPool: cognito.UserPool;
    cognitoRedirectUri: string;
    cognitoDomainPrefix: string;
    cognitoAppClientId: string;
    cognitoRegion: string;
    additionalEnvVars: any; 
    resourceHandlers: ResourceHandlerProps[], 
    hostedZoneId: string
}

/**
 * (This is an example of an L3 construct. As opposed to L2s, L3s are opinionated and don't give access to all available underlying resources.)
 * 
 * Create an API Gateway REST API with Cognito authentication.
 */
export class CognitoRestApi extends Construct {
    constructor(parent: Construct, name: string, props: CognitoRestApiProps) {
        super(parent, name);

        // Reference the certificate for the API domain
        const apiCert = acm.Certificate.fromCertificateArn(this, 'ApiCert',
            props.certificateArn);

        // Configure options for API Gateway
        const apiOptions = {
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowMethods: apigw.Cors.ALL_METHODS
            },
            loggingLevel: apigw.MethodLoggingLevel.INFO,
            dataTraceEnabled: true,
            domainName: {
                domainName: props.domainName,
                certificate: apiCert,
            }
        };

        // That creates the custom domain but does not create the A record...

        // Reference the hosted zone (this does not require a context lookup)
        const apiZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
            hostedZoneId: props.hostedZoneId, 
            zoneName: props.domainName + '.'
        });

        // The REST API
        const api = new apigw.RestApi(this, 'CognitoIDPRestApi', apiOptions);

        // Create the A record to map to the API Gateway custom domain
        const apiARecord = new route53.ARecord(this, 'CognitoIDPCustomDomainAliasRecord', {
            zone: apiZone,
            target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api))
        });

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

        // Create the authorizer for all REST API calls
        const cfnAuthorizer = new apigw.CfnAuthorizer(this, 'Authorizer', {
            name: "CognitoAuthorizer",
            type: apigw.AuthorizationType.COGNITO,
            identitySource: "method.request.header.Authorization",
            restApiId: api.restApiId,
            providerArns: [props.userPool.userPoolArn]
        });

        // TODO - L2 construct for the above? Looks like there isn't one

        // Set up environment variables for our lambda functions
        const envVars: any = {
            "COGNITO_POOL_ID": props.userPool.userPoolId,
            "COGNITO_REDIRECT_URI": props.cognitoRedirectUri,
            "COGNITO_DOMAIN_PREFIX": props.cognitoDomainPrefix,
            "COGNITO_APP_CLIENT_ID": props.cognitoAppClientId,
            "COGNITO_REGION": props.cognitoRegion, 
        };

        // Add the additional environment variables
        for (const [k, v] of Object.entries(props.additionalEnvVars)) {
            envVars[k] = v;
        }

        // Configure the lambda functions for each resource
        const h = new ResourceHandler(
            parent, name, envVars, api, cfnAuthorizer, props.lambdaFunctionDirectory);

        for (const r of props.resourceHandlers) {
            h.addResource(r.resourceName, r.verb, r.requireAuth, r.grantAccess);
        }

    }

}