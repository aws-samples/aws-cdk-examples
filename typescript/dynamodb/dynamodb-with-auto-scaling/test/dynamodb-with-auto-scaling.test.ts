import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { DynamoDbStack } from "..";

describe("DynamoDbStack", () => {
  let stack: Stack;

  beforeEach(() => {
    const app = new App();
    stack = new DynamoDbStack(app, "DynamoDbStack");
  });

  test("stack creates a DynamoDB table with the correct properties", () => {
    const assert = Template.fromStack(stack);

    assert.resourceCountIs("AWS::DynamoDB::Table", 1);
    assert.hasResourceProperties("AWS::DynamoDB::Table", {
      AttributeDefinitions: [
        {
          AttributeName: "pk",
          AttributeType: "S",
        },
        {
          AttributeName: "sk",
          AttributeType: "S",
        },
        {
          AttributeName: "gsi1pk",
          AttributeType: "S",
        },
        {
          AttributeName: "gsi1sk",
          AttributeType: "N",
        },
      ],
      KeySchema: [
        {
          AttributeName: "pk",
          KeyType: "HASH",
        },
        {
          AttributeName: "sk",
          KeyType: "RANGE",
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            {
              AttributeName: "gsi1pk",
              KeyType: "HASH",
            },
            {
              AttributeName: "gsi1sk",
              KeyType: "RANGE",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
      StreamSpecification: {
        StreamViewType: "NEW_AND_OLD_IMAGES",
      },
      TableName: "MyTable",
    });
  });
});
