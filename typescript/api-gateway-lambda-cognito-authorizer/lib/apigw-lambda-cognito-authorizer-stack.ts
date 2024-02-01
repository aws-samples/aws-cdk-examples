import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";

type RestApiProps = {
  cognitoUserPoolId: string;
};

export class ApigwLambdaCognitoAuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RestApiProps) {
    super(scope, id);

    //Define Cloudwatch log group for the api
    const logGroup = new logs.LogGroup(this, "ApiLogs");

    //Define API gateway
    const api = new apigateway.RestApi(this, "ExampleRestAPI", {
      restApiName: "ExampleRestAPI",
      description: "Example Rest API with Cognito Authorizer",
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    });

    //Define the authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [
          cognito.UserPool.fromUserPoolId(
            this,
            "UserPool",
            props.cognitoUserPoolId
          ),
        ],
      }
    );

    // Define the lambda function
    const lambdaFunction = new lambda.Function(this, "validator", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
    });

    // Define the lambda integration
    const validatorIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        proxy: true,
      }
    );

    // Define the resources and methods of the APi gateway
    const newGenAIValidationResource = api.root.addResource("test");
    newGenAIValidationResource.addMethod("GET", validatorIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }
}
