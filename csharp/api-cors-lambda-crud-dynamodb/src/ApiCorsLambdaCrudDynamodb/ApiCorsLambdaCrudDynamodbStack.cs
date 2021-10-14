using System.Collections.Generic;
using System.Net;
using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Lambda.Nodejs;

namespace ApiCorsLambdaCrudDynamodb
{
  public class ApiCorsLambdaCrudDynamodbStack : Stack
  {
    internal ApiCorsLambdaCrudDynamodbStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
    {
      string tableName = "items";
      string primaryKey = "itemId";
      string restApiName = "Items Service";
      string apiName = "itemsApi";
      string gatewayResourcePath = "items";

      var dynamoTable = new Table(this, tableName, new TableProps()
      {
        PartitionKey = new Attribute()
        {
          Name = primaryKey,
          Type = AttributeType.STRING
        },
        TableName = tableName,
        /**
         *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
         * the new table, and it will remain in your account until manually deleted. By setting the policy to
         * DESTROY, cdk destroy will delete the table (even if it has data in it)
         */
        RemovalPolicy = RemovalPolicy.DESTROY
      });

      // create environment variables that are needed by the Lambda functions
      var environmentVariables = new Dictionary<string, string>()
      {
         {"PRIMARY_KEY", primaryKey },
         {"TABLE_NAME", dynamoTable.TableName },
      };

      string[] externalModules = { "aws-sdk" };
      var bundlingOptions = new Amazon.CDK.AWS.Lambda.Nodejs.BundlingOptions()
      {
        // Use the 'aws-sdk' available in the Lambda runtime
        ExternalModules = externalModules
      };

      const string relativeLambdaPath = "./src/ApiCorsLambdaCrudDynamodb/lambdas";

      // Create a Lambda function for each of the CRUD operations
      var getOneLambda = new NodejsFunction(this, "getOneItemFunction", new NodejsFunctionProps
      {
        Runtime = Runtime.NODEJS_14_X,
        Environment = environmentVariables,
        Bundling = bundlingOptions,
        Entry = $"{relativeLambdaPath}/get-one.ts",
        DepsLockFilePath = relativeLambdaPath + "/package-lock.json",
        Tracing = Tracing.ACTIVE
      });

      var getAllLambda = new NodejsFunction(this, "getAllItemFunction", new NodejsFunctionProps
      {
        Runtime = Runtime.NODEJS_14_X,
        Environment = environmentVariables,
        Bundling = bundlingOptions,
        Entry = $"{relativeLambdaPath}/get-all.ts",
        DepsLockFilePath = relativeLambdaPath + "/package-lock.json",
        Tracing = Tracing.ACTIVE
      });

      var createOneLambda = new NodejsFunction(this, "createItemFunction", new NodejsFunctionProps
      {
        Runtime = Runtime.NODEJS_14_X,
        Environment = environmentVariables,
        Bundling = bundlingOptions,
        Entry = $"{relativeLambdaPath}/create.ts",
        DepsLockFilePath = relativeLambdaPath + "/package-lock.json",
        Tracing = Tracing.ACTIVE
      });

      var updateOneLambda = new NodejsFunction(this, "updateItemFunction", new NodejsFunctionProps
      {
        Runtime = Runtime.NODEJS_14_X,
        Environment = environmentVariables,
        Bundling = bundlingOptions,
        Entry = $"{relativeLambdaPath}/update-one.ts",
        DepsLockFilePath = relativeLambdaPath + "/package-lock.json",
        Tracing = Tracing.ACTIVE
      });

      var deleteOneLambda = new NodejsFunction(this, "deleteItemFunction", new NodejsFunctionProps
      {
        Runtime = Runtime.NODEJS_14_X,
        Environment = environmentVariables,
        Bundling = bundlingOptions,
        Entry = $"{relativeLambdaPath}/delete-one.ts",
        DepsLockFilePath = relativeLambdaPath + "/package-lock.json",
        Tracing = Tracing.ACTIVE
      });

      dynamoTable.GrantReadData(getOneLambda);
      dynamoTable.GrantReadData(getAllLambda);
      dynamoTable.GrantReadWriteData(createOneLambda);
      dynamoTable.GrantReadWriteData(updateOneLambda);
      dynamoTable.GrantReadWriteData(deleteOneLambda);

      // Integrate the Lambda functions with the API Gateway resource
      var getAllIntegration = new LambdaIntegration(getAllLambda);
      var createOneIntegration = new LambdaIntegration(createOneLambda);
      var getOneIntegration = new LambdaIntegration(getOneLambda);
      var updateOneIntegration = new LambdaIntegration(updateOneLambda);
      var deleteOneIntegration = new LambdaIntegration(deleteOneLambda);

      // Create an API Gateway resource for each of the CRUD operations
      var api = new RestApi(this, apiName, new RestApiProps()
      {
        RestApiName = restApiName
      });

      var items = api.Root.AddResource(gatewayResourcePath);
      items.AddMethod("GET", getAllIntegration);
      items.AddMethod("POST", createOneIntegration);
      AddCorsOptions(items);

      var singleItem = items.AddResource("{id}");
      singleItem.AddMethod("GET", getOneIntegration);
      singleItem.AddMethod("PATCH", updateOneIntegration);
      singleItem.AddMethod("DELETE", deleteOneIntegration);
      AddCorsOptions(singleItem);
    }

    private void AddCorsOptions(Amazon.CDK.AWS.APIGateway.IResource apiResource)
    {
      apiResource.AddMethod("OPTIONS", new MockIntegration(
        new IntegrationOptions()
        {
          IntegrationResponses = new IntegrationResponse[] {
            new IntegrationResponse()
            {
              StatusCode = ((int)HttpStatusCode.OK).ToString(),
              ResponseParameters = new Dictionary<string, string>()
              {
                // Note the single quotes around the values in this collection, they are required
                { "method.response.header.Access-Control-Allow-Headers", "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'" },
                { "method.response.header.Access-Control-Allow-Origin", "'*'" },
                { "method.response.header.Access-Control-Allow-Credentials", "'false'" },
                { "method.response.header.Access-Control-Allow-Methods", "'OPTIONS,GET,PUT,POST,DELETE'" }
              }
            }
          },
          PassthroughBehavior = PassthroughBehavior.NEVER,
          RequestTemplates = new Dictionary<string, string>()
          {
            { "application/json", "{\"statusCode\": 200}" }
          }
        }),
        new MethodOptions()
        {
          MethodResponses = new MethodResponse[]
          {
            new MethodResponse()
            {
              StatusCode = ((int)HttpStatusCode.OK).ToString(),
              ResponseParameters = new Dictionary<string, bool>()
              {
                { "method.response.header.Access-Control-Allow-Headers", true },
                { "method.response.header.Access-Control-Allow-Methods", true },
                { "method.response.header.Access-Control-Allow-Credentials", true },
                { "method.response.header.Access-Control-Allow-Origin", true },
              }
            }
          }
        });
    }
  }
}
