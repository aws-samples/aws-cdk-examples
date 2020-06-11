import * as lambda from '@aws-cdk/aws-lambda';

/**
 * Properties to configure an API Gateway resource handler.
 * 
 * The expectation is that you have a file that matches, e.g.
 * 
 * This resource:
 * 
 * new ResourceHandlerProps('user', 'get');
 * 
 * is implemented in this file:
 * 
 * lambda/user-get.ts
 */
export class ResourceHandlerProps {
    
    /**
     * @param {string} resourceName The name of the resource, e.g. 'user'
     * @param {string} verb The HTTP verb, e.g. 'get' or 'post'
     * @param {boolean} requireAuth If true, require cognito auth, otherwise the resource is open
     * @param {lambda.Function} grantAccess A function that grants the lambda function access
     */
    constructor(
        public resourceName: string, 
        public verb: string, 
        public requireAuth: boolean, 
        public grantAccess: (f: lambda.Function) => any
    ) {}
}
