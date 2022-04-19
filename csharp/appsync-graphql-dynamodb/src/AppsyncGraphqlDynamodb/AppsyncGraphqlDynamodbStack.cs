using System;
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.AppSync;
using Amazon.CDK.AWS.DynamoDB;
using Constructs;

namespace AppsyncGraphqlDynamodb
{
    public class AppsyncGraphqlDynamodbStack : Stack
    {
        public AppsyncGraphqlDynamodbStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            const string tableName = "items";

            var itemsGraphQLApi = new CfnGraphQLApi(this, "Items", new CfnGraphQLApiProps{
                Name = "items-api",
                AuthenticationType = "API_KEY"
            });

            new CfnApiKey(this, "ItemsApiKey", new CfnApiKeyProps{
                ApiId = itemsGraphQLApi.AttrApiId
            });

            var apiSchema = new CfnGraphQLSchema(this, "ItemsSchema", new CfnGraphQLSchemaProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                Definition = Definition(tableName)
            });

            var itemsTable = new Table(this, "ItemsTable", new TableProps{
                TableName = tableName,
                PartitionKey = new Amazon.CDK.AWS.DynamoDB.Attribute{
                    Name = String.Format("{0}Id", tableName),
                    Type = AttributeType.STRING
                },
                BillingMode = BillingMode.PAY_PER_REQUEST,
                Stream = StreamViewType.NEW_IMAGE,

                // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
                // the new table, and it will remain in your account until manually deleted. By setting the policy to
                // DESTROY, cdk destroy will delete the table (even if it has data in it)
                RemovalPolicy = RemovalPolicy.DESTROY
            });

            var itemsTableRole = new Role(this, "ItemsDynamoDBRole", new RoleProps{
                AssumedBy = new ServicePrincipal("appsync.amazonaws.com")
            });

            itemsTableRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName("AmazonDynamoDBFullAccess"));

            var dataSource = new CfnDataSource(this, "ItemsDataSource", new CfnDataSourceProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                Name = "ItemsDynamoDataSource",
                Type = "AMAZON_DYNAMODB",
                DynamoDbConfig = new Dictionary<string, string>() {
                    {"tableName", itemsTable.TableName},
                    {"awsRegion", this.Region}
                },
                ServiceRoleArn = itemsTableRole.RoleArn
            });

            var getOneResolver = new CfnResolver(this, "GetOneQueryResolver", new CfnResolverProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                TypeName = "Query",
                FieldName = "getOne",
                DataSourceName = dataSource.Name,
                RequestMappingTemplate = String.Format(@"{{
                    ""version"": ""2017-02-28"",
                    ""operation"": ""GetItem"",
                    ""key"": {{
                        ""{0}"": $util.dynamodb.toDynamoDBJson($ctx.args.{0}Id)
                    }}
                    }}", tableName),
                    ResponseMappingTemplate = "$util.toJson($ctx.result)"
            });
            getOneResolver.AddDependsOn(apiSchema);

            var getAllResolver = new CfnResolver(this, "GetAllQueryResolver", new CfnResolverProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                TypeName = "Query",
                FieldName = "all",
                DataSourceName = dataSource.Name,
                RequestMappingTemplate = String.Format(@"{{
                    ""version"": ""2017-02-28"",
                    ""operation"": ""Scan"",
                    ""limit"": $util.defaultIfNull($ctx.args.limit, 20),
                    ""nextToken"": $util.toJson($util.defaultIfNullOrEmpty($ctx.args.nextToken, null))
                    }}", tableName),
                    ResponseMappingTemplate = "$util.toJson($ctx.result)"
            });
            getAllResolver.AddDependsOn(apiSchema);

            var saveResolver = new CfnResolver(this, "SaveMutationResolver", new CfnResolverProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                TypeName = "Mutation",
                FieldName = "save",
                DataSourceName = dataSource.Name,
                RequestMappingTemplate = String.Format(@"{{
                    ""version"": ""2017-02-28"",
                    ""operation"": ""PutItem"",
                    ""key"": {{
                        ""{0}Id"": {{ ""S"": ""$util.autoId()"" }}
                    }},
                    ""attributeValues"": {{
                        ""name"": $util.dynamodb.toDynamoDBJson($ctx.args.name)
                    }}
                    }}", tableName),
                    ResponseMappingTemplate = "$util.toJson($ctx.result)"
            });
            saveResolver.AddDependsOn(apiSchema);

            var deleteResolver = new CfnResolver(this, "DeleteMutationResolver", new CfnResolverProps{
                ApiId = itemsGraphQLApi.AttrApiId,
                TypeName = "Mutation",
                FieldName = "delete",
                DataSourceName = dataSource.Name,
                RequestMappingTemplate = String.Format(@"{{
                    ""version"": ""2017-02-28"",
                    ""operation"": ""Scan"",
                    ""key"": {{
                        ""{0}Id"": $util.dynamodb.toDynamoDBJson($ctx.args.{0}Id)
                    }}
                    }}", tableName),
                    ResponseMappingTemplate = "$util.toJson($ctx.result)"
            });
            deleteResolver.AddDependsOn(apiSchema);
        }

        private string Definition(string tableName) {
            String definition = String.Format(@"type {0}  {{
            {0}Id: ID!
            name: String
            }}
            type Paginated{0} {{
              items: [{0}!]!
              nextToken: String
            }}
            type Query {{
              all(limit: Int, nextToken: String): Paginated{0}!
              getOne({0}Id: ID!): {0}
            }}
            type Mutation {{
              save(name: String!): {0}
              delete({0}Id: ID!): {0}
            }}
            type Schema {{
              query: Query
              mutation: Mutation
            }}", tableName);
            return definition;
        }
    }
}
