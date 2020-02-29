import { LambdaRestApi, CfnAuthorizer, LambdaIntegration, AuthorizationType } from '@aws-cdk/aws-apigateway';
import { AssetCode, Function, Runtime } from '@aws-cdk/aws-lambda';
import { App, Stack } from '@aws-cdk/core';
import { UserPool, SignInType } from '@aws-cdk/aws-cognito'

export class CognitoProtectedApi extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    // Function that returns 201 with "Hello world!"
    const helloWorldFunction = new Function(this, 'helloWorldFunction', {
      code: new AssetCode('src'),
      handler: 'helloworld.handler',
      runtime: Runtime.NODEJS_12_X
    });

    // Rest API backed by the helloWorldFunction
    const helloWorldLambdaRestApi = new LambdaRestApi(this, 'helloWorldLambdaRestApi', {
      restApiName: 'Hello World API',
      handler: helloWorldFunction,
      proxy: false,
    });

    // Cognito User Pool with Email Sign-in Type.
    const userPool = new UserPool(this, 'userPool', {
      signInType: SignInType.EMAIL
    })

    // Authorizer for the Hello World API that uses the
    // Cognito User pool to Authorize users.
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: helloWorldLambdaRestApi.restApiId,
      name: 'HelloWorldAPIAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    })

    // Hello Resource API for the REST API. 
    const hello = helloWorldLambdaRestApi.root.addResource('HELLO');

    // GET method for the HELLO API resource. It uses Cognito for
    // authorization and the auathorizer defined above.
    hello.addMethod('GET', new LambdaIntegration(helloWorldFunction), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
      
    })
    
  }
}


const app = new App();
new CognitoProtectedApi(app, 'CognitoProtectedApi');
app.synth();
