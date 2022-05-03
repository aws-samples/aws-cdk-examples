using System;
using System.Collections.Generic;
using System.Net;
using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Lambda;
using Constructs;
using Attribute = Amazon.CDK.AWS.DynamoDB.Attribute;

namespace ApiCorsCSharpLambdaCrudDynamodb
{
  public class ApiCorsCSharpLambdaCrudDynamodbStack : Stack
  {
    internal ApiCorsCSharpLambdaCrudDynamodbStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
    {
      string tableName = "blogs";
      string primaryKey = "Id";
      string restApiName = "Blogs Service";
      string apiName = "blogsApi";
      string gatewayResourcePath = "blogs";

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

      // Create a Lambda function for each of the CRUD operations
      var getOneLambda = new Function(this, "getBlogFunction", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Code = Code.FromAsset("../app/SampleDynamoBlogApi/src/SampleDynamoBlogApi/bin/Release/netcoreapp3.1/publish/"),
        Handler = "SampleDynamoBlogApi::SampleDynamoBlogApi.Functions::GetBlogAsync",
        Tracing = Tracing.ACTIVE, // enable X-Ray
        Environment = environmentVariables
      });
      var getAllLambda = new Function(this, "getAllBlogsFunction", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Code = Code.FromAsset("../app/SampleDynamoBlogApi/src/SampleDynamoBlogApi/bin/Release/netcoreapp3.1/publish/"),
        Handler = "SampleDynamoBlogApi::SampleDynamoBlogApi.Functions::GetBlogsAsync",
        Tracing = Tracing.ACTIVE, // enable X-Ray
        Environment = environmentVariables
      });

      var createOneLambda = new Function(this, "createBlogFunction", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Code = Code.FromAsset("../app/SampleDynamoBlogApi/src/SampleDynamoBlogApi/bin/Release/netcoreapp3.1/publish/"),
        Handler = "SampleDynamoBlogApi::SampleDynamoBlogApi.Functions::AddBlogAsync",
        Tracing = Tracing.ACTIVE, // enable X-Ray
        Environment = environmentVariables
      });

      var updateOneLambda = new Function(this, "updateBlogFunction", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Code = Code.FromAsset("../app/SampleDynamoBlogApi/src/SampleDynamoBlogApi/bin/Release/netcoreapp3.1/publish/"),
        Handler = "SampleDynamoBlogApi::SampleDynamoBlogApi.Functions::UpdateBlogAsync",
        Tracing = Tracing.ACTIVE, // enable X-Ray
        Environment = environmentVariables
      });

      var deleteOneLambda = new Function(this, "deleteBlogFunction", new FunctionProps
      {
        Runtime = Runtime.DOTNET_CORE_3_1,
        Code = Code.FromAsset("../app/SampleDynamoBlogApi/src/SampleDynamoBlogApi/bin/Release/netcoreapp3.1/publish/"),
        Handler = "SampleDynamoBlogApi::SampleDynamoBlogApi.Functions::RemoveBlogAsync",
        Tracing = Tracing.ACTIVE, // enable X-Ray
        Environment = environmentVariables
      });

      // Add Environment Variable to Reference Table
      var lambdas = new Function[] {getOneLambda, getAllLambda, createOneLambda, updateOneLambda, deleteOneLambda};
      foreach (var lambda in lambdas)
      {
        lambda.AddEnvironment("PRIMARY_KEY", primaryKey);
        lambda.AddEnvironment("TABLE_NAME", dynamoTable.TableName);
      }

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
