using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;

namespace ApiCorsLambdaCrudDynamodb
{
    public class ApiCorsLambdaCrudDynamodbStack : Stack
    {
        public ApiCorsLambdaCrudDynamodbStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var dynamoTable = new Table(this, "items", new TableProps{
                PartitionKey = new Attribute{
                    Name = "itemId",
                    Type = AttributeType.STRING
                },
                TableName = "Items",

                // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
                // the new table, and it will remain in your account until manually deleted. By setting the policy to 
                // DESTROY, cdk destroy will delete the table (even if it has data in it)
                RemovalPolicy = RemovalPolicy.DESTROY
            });

            var environment = new Dictionary<string, string>() {
                    {"TABLE_NAME", dynamoTable.TableName},
                    {"PRIMARY_KEY", "itemId"}
            };

            var getOneLambda = new Function(this, "getOneItemFunction", new FunctionProps{
                Code = new AssetCode("lambda_src/dist"),
                Handler = "get-one.handler",
                Runtime = Runtime.NODEJS_10_X,
                Environment = environment
            });

            var getAllLambda = new Function(this, "getAllItemsFunction", new FunctionProps{
                Code = new AssetCode("lambda_src/dist"),
                Handler = "get-all.handler",
                Runtime = Runtime.NODEJS_10_X,
                Environment = environment
            });

            var createOneLambda = new Function(this, "createItemFunction", new FunctionProps{
                Code = new AssetCode("lambda_src/dist"),
                Handler = "create.handler",
                Runtime = Runtime.NODEJS_10_X,
                Environment = environment
            });

            var updateOneLambda = new Function(this, "updateItemFunction", new FunctionProps{
                Code = new AssetCode("lambda_src/dist"),
                Handler = "update-one.handler",
                Runtime = Runtime.NODEJS_10_X,
                Environment = environment
            });

            var deleteOneLambda = new Function(this, "deleteItemFunction", new FunctionProps{
                Code = new AssetCode("lambda_src/dist"),
                Handler = "delete-one.handler",
                Runtime = Runtime.NODEJS_10_X,
                Environment = environment
            });

            dynamoTable.GrantReadWriteData(getAllLambda);
            dynamoTable.GrantReadWriteData(getOneLambda);
            dynamoTable.GrantReadWriteData(createOneLambda);
            dynamoTable.GrantReadWriteData(updateOneLambda);
            dynamoTable.GrantReadWriteData(deleteOneLambda);

            var api = new RestApi(this, "itemsApi", new RestApiProps{
                RestApiName = "Items Service",
                DefaultCorsPreflightOptions = new CorsOptions{
                    AllowOrigins = new string[] {"*"},
                    AllowHeaders = new string[] {"Content-Type","X-Amz-Date","Authorization","X-Api-Key","X-Amz-Security-Token","X-Amz-User-Agent"},
                    AllowCredentials = true,
                    AllowMethods = new string[] {"OPTIONS", "GET", "PUT", "POST", "DELETE"}
                }
            });

            var items = api.Root.AddResource("items");
            var getAllIntegration = new LambdaIntegration(getAllLambda);
            items.AddMethod("GET", getAllIntegration);

            var createOneIntegration = new LambdaIntegration(createOneLambda);
            items.AddMethod("POST", createOneIntegration);

            var singleItem = items.AddResource("{id}");
            var getOneIntegration = new LambdaIntegration(getOneLambda);
            singleItem.AddMethod("GET", getOneIntegration);

            var updateOneIntegration = new LambdaIntegration(updateOneLambda);
            singleItem.AddMethod("PATCH", updateOneIntegration);

            var deleteOneIntegration = new LambdaIntegration(deleteOneLambda);
            singleItem.AddMethod("DELETE", deleteOneIntegration);

        }
    }
}
