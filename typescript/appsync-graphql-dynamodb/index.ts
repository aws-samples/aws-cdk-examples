import cdk = require('@aws-cdk/cdk');
import { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema, CfnDataSource, CfnResolver } from '@aws-cdk/aws-appsync';
import { Table, AttributeType, StreamViewType, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam';


export class AppSyncCdkStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = 'items'

    const itemsGraphQLApi = new CfnGraphQLApi(this, 'ItemsApi', {
      name: 'items-api',
      authenticationType: 'API_KEY'
    });

    new CfnApiKey(this, 'ItemsApiKey', {
      apiId: itemsGraphQLApi.graphQlApiApiId
    });

    const apiSchema = new CfnGraphQLSchema(this, 'ItemsSchema', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      definition: `type ${tableName} {
        ${tableName}Id: ID!
        name: String
      }
      type Paginated${tableName} {
        items: [${tableName}!]!
        nextToken: String
      }
      type Query {
        all(limit: Int, nextToken: String): Paginated${tableName}!
        getOne(${tableName}Id: ID!): ${tableName}
      }
      type Mutation {
        save(name: String!): ${tableName}
        delete(${tableName}Id: ID!): ${tableName}
      }
      type Schema {
        query: Query
        mutation: Mutation
      }`
    });

    const itemsTable = new Table(this, 'ItemsTable', {
      tableName: tableName,
      partitionKey: {
        name: `${tableName}Id`,
        type: AttributeType.String
      },
      billingMode: BillingMode.PayPerRequest,
      streamSpecification: StreamViewType.NewImage
    });

    const itemsTableRole = new Role(this, 'ItemsDynamoDBRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com')
    });

    itemsTableRole.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess');

    const dataSource = new CfnDataSource(this, 'ItemsDataSource', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      name: 'ItemsDynamoDataSource',
      type: 'AMAZON_DYNAMODB',
      dynamoDbConfig: {
        tableName: itemsTable.tableName,
        awsRegion: this.region
      },
      serviceRoleArn: itemsTableRole.roleArn
    });

    const getOneResolver = new CfnResolver(this, 'GetOneQueryResolver', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      typeName: 'Query',
      fieldName: 'getOne',
      dataSourceName: dataSource.dataSourceName,
      requestMappingTemplate: `{
        "version": "2017-02-28",
        "operation": "GetItem",
        "key": {
          "${tableName}Id": $util.dynamodb.toDynamoDBJson($ctx.args.${tableName}Id)
        }
      }`,
      responseMappingTemplate: `$util.toJson($ctx.result)`
    });
    getOneResolver.addDependsOn(apiSchema);

    const getAllResolver = new CfnResolver(this, 'GetAllQueryResolver', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      typeName: 'Query',
      fieldName: 'all',
      dataSourceName: dataSource.dataSourceName,
      requestMappingTemplate: `{
        "version": "2017-02-28",
        "operation": "Scan",
        "limit": $util.defaultIfNull($ctx.args.limit, 20),
        "nextToken": $util.toJson($util.defaultIfNullOrEmpty($ctx.args.nextToken, null))
      }`,
      responseMappingTemplate: `$util.toJson($ctx.result)`
    });
    getAllResolver.addDependsOn(apiSchema);

    const saveResolver = new CfnResolver(this, 'SaveMutationResolver', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      typeName: 'Mutation',
      fieldName: 'save',
      dataSourceName: dataSource.dataSourceName,
      requestMappingTemplate: `{
        "version": "2017-02-28",
        "operation": "PutItem",
        "key": {
          "${tableName}Id": { "S": "$util.autoId()" }
        },
        "attributeValues": {
          "name": $util.dynamodb.toDynamoDBJson($ctx.args.name)
        }
      }`,
      responseMappingTemplate: `$util.toJson($ctx.result)`
    });
    saveResolver.addDependsOn(apiSchema);

    const deleteResolver = new CfnResolver(this, 'DeleteMutationResolver', {
      apiId: itemsGraphQLApi.graphQlApiApiId,
      typeName: 'Mutation',
      fieldName: 'delete',
      dataSourceName: dataSource.dataSourceName,
      requestMappingTemplate: `{
        "version": "2017-02-28",
        "operation": "DeleteItem",
        "key": {
          "${tableName}Id": $util.dynamodb.toDynamoDBJson($ctx.args.${tableName}Id)
        }
      }`,
      responseMappingTemplate: `$util.toJson($ctx.result)`
    });
    deleteResolver.addDependsOn(apiSchema);

  }
}

const app = new cdk.App();
new AppSyncCdkStack(app, 'AppSyncGraphQLDynamoDBExample');
app.synth();
