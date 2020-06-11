import * as cdk from '@aws-cdk/core';
import lambda = require('@aws-cdk/aws-lambda');
import { AuthorizationType } from "@aws-cdk/aws-apigateway";
import apigw = require('@aws-cdk/aws-apigateway');
import { ResourceHandlerProps } from './resource-handler-props';

/**
 * This is an opinionated way to arrange lambda handlers... there are lots of ways to do this.
 * 
 * This class gives you basic path handling without needing to install something like Express.
 * 
 * The upside is that you get a fully configured API, with each resource visible and 
 * configurable in API Gateway. The downside is that each lambda function eats into your 
 * CloudFormation stack limits. A large, complex API might hit those limits.
 * 
 * Also... this is sample code, so YMMV.
 */
export class ResourceHandler {

    constructor(
        private parent: cdk.Construct,
        private stackName: string,
        private envVars: any,
        private api: apigw.RestApi,
        private cfnAuthorizer: apigw.CfnAuthorizer, 
        private lambdaFunctionDirectory: string) { }

    /**
     * Add a new resource to our API gateway and map it to a local file:
     * 
     * resourceName-verb.ts
     * 
     * E.g. for the POST /user resource, we create a file called:
     * 
     * ./functions/user-post.ts
     * 
     * That file has the lambda handler code.
     */
    public addResource(
        resourceName: string,
        verb: string,
        requireAuth: boolean, 
        grantAccess: (f: lambda.Function) => any) {

        let resourceId: string | undefined;

        // Perform *very* basic path handling
        if (resourceName.indexOf('/') > -1) {
            const tokens = resourceName.split('/');
            if (tokens.length > 2) {
                throw Error('Multiple parameters are not supported');
                // TODO - This could be improved with {proxy+}
            }
            resourceName = tokens[0];
            resourceId = tokens[1];
        } else {
            resourceId = undefined;
        }

        const lambdaName = `${resourceName}-${verb}`;

        const lf = new lambda.Function(this.parent, lambdaName, {
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset(this.lambdaFunctionDirectory),
            handler: `${resourceName}-${verb}.handler`,
            memorySize: 1536,
            timeout: cdk.Duration.minutes(5),
            description: `${this.stackName} ${resourceName} ${verb}`,
            environment: this.envVars
        });

        grantAccess(lf);

        let resource = this.api.root.getResource(resourceName);
        if (!resource) {
            resource = this.api.root.addResource(resourceName);
        }

        // If the resource is something like /foo/{fooId}
        let idResource;
        if (resourceId) {
            idResource = resource.getResource(resourceId);
        }

        if (idResource) {
            // We already defined this resource, for example, 
            // defined /foo/{fooId} GET and now we are defining DELETE 
            resource = idResource;
        } else {
            // We have not yet defined the {fooId} part of the path
            if (resourceId !== undefined) {
                resource = resource.addResource(resourceId);
            }
        }

        let options = {};
        if (requireAuth) {
            options = {
                authorizer: { authorizerId: this.cfnAuthorizer.ref },
                authorizationType: AuthorizationType.COGNITO,
            };
        }

        resource.addMethod(verb, new apigw.LambdaIntegration(lf), options);

    }
}