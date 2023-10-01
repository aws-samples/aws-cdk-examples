using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Constructs;
using IResource = Amazon.CDK.AWS.APIGateway.IResource;

namespace ApiCorsLambdaCrudDynamodb
{
  public class ApiCorsLambdaCrudDynamodbStack : Stack
  {
    internal ApiCorsLambdaCrudDynamodbStack(Construct scope,
      string id,
      IStackProps props = null) : base(scope,
      id,
      props)
    {
      var dynamoTable = new Table(
        this,
        "items",
        new TableProps()
        {
          PartitionKey = new Attribute()
          {
            Name = "ItemId",
            Type = AttributeType.STRING
          },
          TableName = "Items",

          /*
          *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
          * the new table, and it will remain in your account until manually deleted. By setting the policy to
          * DESTROY, cdk destroy will delete the table (even if it has data in it)
          */
          RemovalPolicy = RemovalPolicy.DESTROY // NOT recommended for production code
        });

      var createOneLambda = new DockerImageFunction(
        this,
        "createItemFunction",
        new DockerImageFunctionProps()
        {
          Code = BuildDockerImageCode("Create"),
          FunctionName = "createItemFunction",
          Timeout = Duration.Seconds(10)
        }
      );

      var getOneLambda = new DockerImageFunction(
        this,
        "getOneItemFunction",
        new DockerImageFunctionProps()
        {
          Code = BuildDockerImageCode("GetOne"),
          FunctionName = "getOneItemFunction",
          Timeout = Duration.Seconds(10)
        }
      );

      var getAllLambda = new DockerImageFunction(
        this,
        "getAllItemsFunction",
        new DockerImageFunctionProps()
        {
          Code = BuildDockerImageCode("GetAll"),
          FunctionName = "getAllItemsFunction",
          Timeout = Duration.Seconds(10)
        }
      );

      var updateOneLambda = new DockerImageFunction(
        this,
        "updateItemFunction",
        new DockerImageFunctionProps()
        {
          Code = BuildDockerImageCode("UpdateOne"),
          FunctionName = "updateItemFunction",
          Timeout = Duration.Seconds(10)
        }
      );

      var deleteOneLambda = new DockerImageFunction(
        this,
        "deleteItemFunction",
        new DockerImageFunctionProps()
        {
          Code = BuildDockerImageCode("DeleteOne"),
          FunctionName = "deleteItemFunction",
          Timeout = Duration.Seconds(10)
        }
      );

      // Grant the Lambda function read / write / describe access to the DynamoDB table
      dynamoTable.GrantReadData(getAllLambda);
      dynamoTable.GrantDescribeTable(getAllLambda);

      dynamoTable.GrantReadData(getOneLambda);
      dynamoTable.GrantDescribeTable(getOneLambda);

      dynamoTable.GrantReadWriteData(createOneLambda);
      dynamoTable.GrantDescribeTable(createOneLambda);

      dynamoTable.GrantReadWriteData(updateOneLambda);
      dynamoTable.GrantDescribeTable(updateOneLambda);

      dynamoTable.GrantReadWriteData(deleteOneLambda);
      dynamoTable.GrantDescribeTable(deleteOneLambda);

      // Integrate the Lambda functions with the API Gateway resource
      var getAllIntegration = new LambdaIntegration(getAllLambda);
      var createOneIntegration = new LambdaIntegration(createOneLambda);
      var getOneIntegration = new LambdaIntegration(getOneLambda);
      var updateOneIntegration = new LambdaIntegration(updateOneLambda);
      var deleteOneIntegration = new LambdaIntegration(deleteOneLambda);

      // Create an API Gateway resource for each of the CRUD operations
      var api = new RestApi(this,
        "itemsApi",
        new LambdaRestApiProps()
        {
          RestApiName = "Items Service"
        });

      var items = api.Root.AddResource("items");
      items.AddMethod("GET",
        getAllIntegration);
      items.AddMethod("POST",
        createOneIntegration);
      AddCorsOptions(items);

      var singleItem = items.AddResource("{id}");
      singleItem.AddMethod("GET",
        getOneIntegration);
      singleItem.AddMethod("PATCH",
        updateOneIntegration);
      singleItem.AddMethod("DELETE",
        deleteOneIntegration);
      AddCorsOptions(singleItem);
    }

    private void AddCorsOptions(IResource apiResource)
    {
      apiResource.AddMethod("OPTIONS",
        new MockIntegration(new IntegrationOptions()
        {
          IntegrationResponses = new IIntegrationResponse[]
          {
            new IntegrationResponse()
            {
              StatusCode = "200",
              ResponseParameters = new Dictionary<string, string>()
              {
                {
                  "method.response.header.Access-Control-Allow-Headers",
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
                },
                {
                  "method.response.header.Access-Control-Allow-Origin", "'*'"
                },
                {
                  "method.response.header.Access-Control-Allow-Credentials", "'false'"
                },
                {
                  "method.response.header.Access-Control-Allow-Methods", "'OPTIONS,GET,PUT,POST,DELETE'"
                }
              }
            }
          },
          PassthroughBehavior = PassthroughBehavior.NEVER,
          RequestTemplates = new Dictionary<string, string>()
          {
            {
              "application/json", "{\"statusCode\": 200}"
            }
          },
        }),
        new MethodOptions()
        {
          MethodResponses = new IMethodResponse[]
          {
            new MethodResponse()
            {
              StatusCode = "200",
              ResponseParameters = new Dictionary<string, bool>()
              {
                {
                  "method.response.header.Access-Control-Allow-Headers", true
                },
                {
                  "method.response.header.Access-Control-Allow-Methods", true
                },
                {
                  "method.response.header.Access-Control-Allow-Credentials", true
                },
                {
                  "method.response.header.Access-Control-Allow-Origin", true
                }
              }
            }
          }
        });
    }

    private DockerImageCode BuildDockerImageCode(string dockerImageName) =>
      DockerImageCode.FromImageAsset(
        "src/Lambdas",
        new AssetImageCodeProps()
        {
          File = $"{dockerImageName}/Dockerfile"
        });
  }
}
