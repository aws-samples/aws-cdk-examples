import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DynamoDbStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const tableName = "MyTable";
    const partitionKey = "pk";
    const sortKey = "sk";

    const table = new dynamodb.Table(this, "MyTable", {
      tableName,
      partitionKey: { name: partitionKey, type: dynamodb.AttributeType.STRING },
      sortKey: { name: sortKey, type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Enable stream
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete table on stack delete
    });

    // Add a global secondary index with partition key and sort key
    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Enable Auto Scaling for read and write capacity
    table.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 5,
    });

    table.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 5,
    });

    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
  }
}

const app = new cdk.App();
new DynamoDbStack(app, "DynamoDbStack");
app.synth();
