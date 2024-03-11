#!/usr/bin/env node
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, } from 'aws-cdk-lib/aws-dynamodb';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from 'aws-cdk-lib/custom-resources';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkSampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    //define a dynamodb that store the number of hit that counted by counter lambda function
    const table = new Table(this, 'Table', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });

    //lambda function as the backend
    const backend = new Function(this, 'Backend', {
      runtime: Runtime.PYTHON_3_10,
      handler: 'app.lambda_handler',
      code: Code.fromAsset('lambda/backend'),
      tracing: Tracing.ACTIVE,
      environment: {
        DDB_TABLE_NAME: table.tableName,
      }
    });

    //define a api gateway with lambda function as backend
    const api = new LambdaRestApi(this, 'EndpointCounter', {
      handler: backend,
      proxy: false,
    });

    //ddb grant write to counter function, read to backend function
    // table.grantReadData(counter);
    table.grantReadData(backend);

    //add a method to the rest api, use counter to calculate the hit
    api.root.addMethod('GET');
    
    //define a cloudformation custom resouce that load some fake data into ddb table. 
    new AwsCustomResource(this, 'LoadDummyData', {
      onCreate: {
        service: 'DynamoDB',
        action: 'putItem',
        parameters: {
          TableName: table.tableName,
          Item: { id: { S: '1' }, count: { N: '0' } },
          ReturnValues: 'NONE',
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
    });
  }
};

const app = new App();
new CdkSampleStack(app, 'CdkSampleStack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});