import * as path from 'path'
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Stack, which creates LambdaRestApi Gateway, with TokenAuthorizer
 *
 * @export
 * @class GatewayLambdaAuth
 * @extends {cdk.Stack}
 */
export class GatewayLambdaAuth extends cdk.Stack {
  readonly operationalLambda: cdk.aws_lambda.IFunction;
  readonly lambdaIntegration: cdk.aws_apigateway.LambdaIntegration;

  readonly operationalEntryPath = path.join(__dirname + "/../lambdas/operational/index.ts")
  readonly authLambdaEntryPath = path.join(__dirname + "/../lambdas/authorizer/index.ts")

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** Creating operational Lambda, which server the request */
    let operationalLambda = this.getOperationalFunction();

    /** Lambda, which takes incoming request and checks the authorization and authentication */
    let authorizerLambda = this.getLambdaAuthFunction();

    /** Generating Token Authorization, which will be injected to API Gateway */
    let lambdaTokenAuthorizer = this.getTokenAuthorizer(authorizerLambda)

    /** Creating Lambda Rest API, which integrates Endpoint to Lambda */
    let lambdaRestApi = this.createRestApi(operationalLambda, lambdaTokenAuthorizer);

    /** Creating /health resource at root for lambda Rest API */
    const healthResource = lambdaRestApi.root.addResource("health");
    healthResource.addMethod("GET");

    /** Returning Output with URL made as part of lambdaRestApi */
    new cdk.CfnOutput(this, "apiUrl", { value: lambdaRestApi.url });
  }


  /**
   * Creating Operational Lambda, to server the incoming request
   *
   * @private
   * @return {*}  {cdk.aws_lambda.IFunction}
   * @memberof GatewayLambdaAuth
   */
  private getOperationalFunction(): cdk.aws_lambda.IFunction {
    return new cdk.aws_lambda_nodejs.NodejsFunction(this, "operational-lambda", {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      bundling: {
        sourceMap: true,
        minify: true,
      },
      description: 'Operational Lambda',
      entry: this.operationalEntryPath,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
      memorySize: 512,
      timeout: cdk.Duration.minutes(2),
    });
  }


  /**
   * Creating Authorization Lambda, to validate incoming request
   *
   * @private
   * @return {*}  {cdk.aws_lambda.IFunction}
   * @memberof GatewayLambdaAuth
   */
  private getLambdaAuthFunction(): cdk.aws_lambda.IFunction {
    return new cdk.aws_lambda_nodejs.NodejsFunction(this, "authentication-lambda", {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      bundling: {
        sourceMap: true,
        minify: true,
      },
      description: 'Lambda Authorizer',
      entry: this.authLambdaEntryPath,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
      memorySize: 512,
      timeout: cdk.Duration.minutes(2),
    });
  }


  /**
   * Creating Token Authorizer, to inject auth-lambda into Rest API Gateway
   *
   * @private
   * @param {IFunction} authorizerLambda
   * @return {*}  {cdk.aws_apigateway.TokenAuthorizer}
   * @memberof GatewayLambdaAuth
   */
  private getTokenAuthorizer(authorizerLambda: cdk.aws_lambda.IFunction): cdk.aws_apigateway.TokenAuthorizer {
    return new cdk.aws_apigateway.TokenAuthorizer(
      this,
      "operationalAuthorizer",
      {
        handler: authorizerLambda,
      }
    );
  }


  /**
   * Creating Lambda Rest API, that integrates API to Operational Lambda with Token Authorizer
   *
   * @private
   * @param {cdk.aws_lambda.IFunction} operationalLambda
   * @param {cdk.aws_apigateway.TokenAuthorizer} lambdaAuthorizer
   * @return {*}  {cdk.aws_apigateway.LambdaRestApi}
   * @memberof GatewayLambdaAuth
   */
  private createRestApi(
    operationalLambda: cdk.aws_lambda.IFunction,
    lambdaAuthorizer: cdk.aws_apigateway.TokenAuthorizer
  ): cdk.aws_apigateway.LambdaRestApi {
    const logGroup = this.createApiGatewayAccessLogsGroup(this);
    return new cdk.aws_apigateway.LambdaRestApi(this, "rest-api-gateway", {
      handler: operationalLambda,
      proxy: false,
      deployOptions: {
        stageName: "dev",
        accessLogDestination: new cdk.aws_apigateway.LogGroupLogDestination(
          logGroup
        ),
        accessLogFormat:
          cdk.aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultMethodOptions: {
        authorizer: lambdaAuthorizer,
      },
    });
  }


  /**
   * Creating Access-log Group, for API Gateway
   *
   * @private
   * @param {Construct} scope
   * @return {*}  {cdk.aws_logs.ILogGroup}
   * @memberof GatewayLambdaAuth
   */
  private createApiGatewayAccessLogsGroup(
    scope: Construct
  ): cdk.aws_logs.ILogGroup {
    const logGroupName = "apigateway-auth-lambda";
    const logRetention = new cdk.aws_logs.LogRetention(
      scope,
      "apiGwLogGroupConstruct",
      {
        logGroupName: logGroupName,
        retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );
    const logGroup = cdk.aws_logs.LogGroup.fromLogGroupArn(
      scope,
      "apiGwLogGroup",
      logRetention.logGroupArn
    );
    return logGroup;
  }
}

/**
 *  API
 *  https://{GatewayId}.execute-api.us-east-1.amazonaws.com/dev/health
*/
