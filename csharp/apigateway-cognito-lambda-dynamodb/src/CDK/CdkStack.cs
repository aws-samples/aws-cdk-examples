using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;
using Amazon.CDK.AWS.Cognito;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using System.Web;
using System.Collections.Generic;
using System;
using AssetOptions = Amazon.CDK.AWS.S3.Assets.AssetOptions;

namespace ApiGatewayAuthStack
{
  /*
  CDK Code For -
  1. Create Cognito User Pool
  2. Lambda function to return "Hello" message for GET enadpoint and "Created" message for POST endpoint 
  3. API GW Proxy integration with Lambda function
  4. API GW Lambda function Authorizer 
  5. DynamoDB to hold rAPI GW access policy document
  */
  public class CdkStack : Stack
  {
    internal CdkStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
    {

      #region "Cognito User Pool"
      // Create Cognito User Pool with Email Sign-in.
      var userPool = new UserPool(this, "CognitoUserPool", new UserPoolProps
      {
        UserPoolName = "CognitoUserPool",
        RemovalPolicy = RemovalPolicy.DESTROY, //Delete Cognito User pool on CDK destroy
        SignInAliases = new SignInAliases
        {
          Email = true
        },
        SelfSignUpEnabled = false
      });

      //Create Cognito user group
      var userPoolGroupReadOnly = new CfnUserPoolGroup(this, "UserPoolGroupReadOnly", new CfnUserPoolGroupProps
      {
        UserPoolId = userPool.UserPoolId,
        Description = "Read Only Access",
        GroupName = "read-only",
      });

      //Create Cognito user group
      var userPoolGroupReadUpdateAdd = new CfnUserPoolGroup(this, "UserPoolGroupReadUpdateAdd", new CfnUserPoolGroupProps
      {
        UserPoolId = userPool.UserPoolId,
        Description = "Full Access",
        GroupName = "read-update-add",
      });

      // Create Cognito App Client
      string CallbackUrl = "http://localhost";
      var cognitoAppClient = new UserPoolClient(this, "CognitoAppClient", new UserPoolClientProps
      {
        UserPoolClientName = "CognitoAppClient",
        UserPool = userPool,
        AccessTokenValidity = Duration.Minutes(20),
        IdTokenValidity = Duration.Minutes(20),
        RefreshTokenValidity = Duration.Hours(1),
        AuthFlows = new AuthFlow
        {
          UserPassword = true,
          UserSrp = true
        },
        OAuth = new OAuthSettings
        {
          CallbackUrls = new string[] { CallbackUrl },
          Flows = new OAuthFlows
          {
            ImplicitCodeGrant = true
          },
          Scopes = new[] { OAuthScope.EMAIL, OAuthScope.OPENID }
        }
      });

      //Create Domain name for Cognito Hosted UI
      var cognitoDomainName = new UserPoolDomain(this, "CognitoDomainName", new UserPoolDomainProps
      {
        UserPool = userPool,
        CognitoDomain = new CognitoDomainOptions
        {
          DomainPrefix = "sign-in-" + cognitoAppClient.UserPoolClientId
        }
      });

      #endregion

      #region "Auth Lambda and DynamoDB table"
      // DynamoDB table
      var userPoolGroupApiPolicyTable = new Table(this, "UserPoolGroupApiPolicy", new TableProps
      {
        TableName = "UserGroupApiGwAccessPolicy",
        RemovalPolicy = RemovalPolicy.DESTROY, //Delete DynamoDB table on CDK destroy
        PartitionKey = new Amazon.CDK.AWS.DynamoDB.Attribute { Name = "UserPoolGroup", Type = AttributeType.STRING }
      });

      var authLambdaEnvVariables = new Dictionary<string, string>
      {
        {"REGION", this.Region},
        {"COGNITO_USER_POOL_ID", userPool.UserPoolId},
        {"CLIENT_ID", cognitoAppClient.UserPoolClientId},
        {"TABLE_NAME", userPoolGroupApiPolicyTable.TableName},
      };

      // Auth Lambda function
      var authLambdaFun = new Function(this, "AuthLambdaFunc", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Handler = "AuthFunction::Lambda.AuthFunction.Function::FunctionHandler",
        Code = Code.FromAsset("./dist/AuthFunction"),
        Environment = authLambdaEnvVariables,
        Timeout = Duration.Minutes(1),
        MemorySize = 256
      });
      userPoolGroupApiPolicyTable.GrantReadData(authLambdaFun);

      #endregion

      #region "API Gateway and backend Lambda function"
      // Lambda function
      var backendLambdaFun = new Function(this, "BackendLambdaFunc", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Handler = "BackendFunction::Lambda.BackendFunction.Function::FunctionHandler",
        Code = Code.FromAsset("./dist/BackendFunction"),
      });

      var tokenAuthorizer = new TokenAuthorizer(this, "LambdaTokenAuthorizer", new TokenAuthorizerProps
      {
        Handler = authLambdaFun,
        IdentitySource = "method.request.header.authorization",
        ResultsCacheTtl = Duration.Seconds(0)
      });

      // APIGateway 
      var apiGateway = new RestApi(this, "SampleApi", new RestApiProps()
      {
        RestApiName = "SampleApi",
        Description = "Lambda Backed API",
        DeployOptions = new StageOptions
        {
          StageName = "Dev",
          ThrottlingBurstLimit = 10,
          ThrottlingRateLimit = 10,
          LoggingLevel = MethodLoggingLevel.INFO,
          MetricsEnabled = true
        },
        DefaultMethodOptions = new MethodOptions
        {
          Authorizer = tokenAuthorizer,
          AuthorizationType = AuthorizationType.CUSTOM
        },

      });

      // APIGateway - GET endpoint
      var getEndpoint = apiGateway.Root.AddMethod("GET", new LambdaIntegration(backendLambdaFun, new LambdaIntegrationOptions
      {
        Proxy = true,
      }));

      // APIGateway - POST endpoint
      var postEndpoint = apiGateway.Root.AddMethod("POST", new LambdaIntegration(backendLambdaFun, new LambdaIntegrationOptions
      {
        Proxy = true
      }));
      #endregion

      #region "CloudFormation Output"
      new CfnOutput(this, "CognitoHostedUIUrl", new CfnOutputProps
      {
        Value = String.Format("{0}/login?response_type=token&client_id={1}&redirect_uri={2}", cognitoDomainName.BaseUrl(), cognitoAppClient.UserPoolClientId, HttpUtility.UrlEncode(CallbackUrl))
      });

      new CfnOutput(this, "APIGWEndpoint", new CfnOutputProps
      {
        Value = apiGateway.Url
      });

      #endregion
    }
  }
}
