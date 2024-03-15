import cdk = require('aws-cdk-lib');
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync' ;
import { Construct } from 'constructs';

export class AppSyncCdkStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const itemsGraphQLApi = new appsync.GraphqlApi(this, 'ItemsApi', {
      name: 'ItemsApi',
      definition: appsync.Definition.fromFile('schema.graphql'),
    });

    const itemsTable = new Table(this, 'ItemsTable', {
      tableName: 'items',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      },

      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const dataSource = itemsGraphQLApi.addDynamoDbDataSource('itemsDataSource', itemsTable);

    dataSource.createResolver('QueryGetAllItemsResolver', {
      typeName: 'Query',
      fieldName: 'getAllItems',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    dataSource.createResolver('QueryGetOneItemResolver', {
      typeName: 'Query',
      fieldName: 'getOneItem',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem("id","id"),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('MutationAddItemResolver', {
      typeName: 'Mutation',
      fieldName: 'addItem',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').auto(),
        appsync.Values.projecting('input'),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('MutationUpdateItemResolver', {
      typeName: 'Mutation',
      fieldName: 'updateItem',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition('id').is('id'),
        appsync.Values.projecting('input'),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('MutationDeleteItemResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteItem',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem("id","id"),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // Prints out URL
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: itemsGraphQLApi.graphqlUrl
    });

    // Prints out the AppSync GraphQL API key to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: itemsGraphQLApi.apiKey || ''
    });

    // Prints out the stack region to the terminal
    new cdk.CfnOutput(this, "Stack Region", {
      value: this.region
    });
  }
}

const app = new cdk.App();
new AppSyncCdkStack(app, 'AppSyncGraphQLDynamoDBExample');
app.synth();
