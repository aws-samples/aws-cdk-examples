import * as cdk from 'aws-cdk-lib';
import { AppsyncFunction, AuthorizationType, Code, Definition, FunctionRuntime, GraphqlApi, Resolver } from 'aws-cdk-lib/aws-appsync';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import path = require('path');

export class CdkAppsyncDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const carsTable = new Table(this, 'CarTable', {
      partitionKey: { name: 'licenseplate', type: AttributeType.STRING },
      tableName: 'cardata-cars',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 2,
      writeCapacity: 4
    });

    const defectsTable = new Table(this, 'DefectsTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: 'cardata-defects',
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 2,
      writeCapacity: 4
    });

    defectsTable.addGlobalSecondaryIndex({
      indexName: 'defect-by-licenseplate',
      partitionKey: {
        name: 'licenseplate',
        type: AttributeType.STRING
      },
      readCapacity: 2,
      writeCapacity: 4,
    })

    const api = new GraphqlApi(this, 'CarApi', {
      name: 'carAPI',
      definition: Definition.fromFile(path.join(__dirname, '../graphql/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.IAM,
        },
      },
      xrayEnabled: true,
    });

    // Connect DynamoDB tables to the AppSync API as data sources
    const carsDataSource = api.addDynamoDbDataSource('CarsDataSource', carsTable);
    const defectsDataSource = api.addDynamoDbDataSource('DefectsDataSource', defectsTable);

    const carsResolver = new AppsyncFunction(this, 'CarsFunction', {
      name: 'getCars',
      api,
      dataSource: carsDataSource,
      code: Code.fromAsset(path.join(__dirname, '../resolvers/getCar.js')),
      runtime: FunctionRuntime.JS_1_0_0,
    });

    const defectsResolver = new AppsyncFunction(this, 'DefectsFunction', {
      name: 'getDefects',
      api,
      dataSource: defectsDataSource,
      code: Code.fromAsset(path.join(__dirname, '../resolvers/getDefects.js')),
      runtime: FunctionRuntime.JS_1_0_0,
    });

    new Resolver(this, 'PipelineResolverGetCars', {
      api,
      typeName: 'Query',
      fieldName: 'getCar',
      runtime: FunctionRuntime.JS_1_0_0,
      code: Code.fromAsset(path.join(__dirname, '../resolvers/pipeline.js')),
      pipelineConfig: [carsResolver],
    });

    new Resolver(this, 'PipelineResolverGetDefects', {
      api,
      typeName: 'Car',
      fieldName: 'defects',
      runtime: FunctionRuntime.JS_1_0_0,
      code: Code.fromAsset(path.join(__dirname, '../resolvers/pipeline.js')),
      pipelineConfig: [defectsResolver],
    });

  }
}