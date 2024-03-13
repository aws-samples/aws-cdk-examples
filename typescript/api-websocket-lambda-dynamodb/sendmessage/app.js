// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// @see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
// @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/apigatewaymanagementapi/command/PostToConnectionCommand/
import { ApiGatewayManagementApiClient, GoneException, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const ddb = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddb);

const { TABLE_NAME } = process.env;

export const handler = async (event, context) => {
  let connectionDataResponse;

  // Get a list of connections to our API that have been recorded in DynamoDB.
  try {
    const command = new ScanCommand({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' });
    connectionDataResponse = await docClient.send(command);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.info(`Found ${connectionDataResponse.Items.length} connections`, connectionDataResponse.Items);

  // @see https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html
  const callbackUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const apigwManagementApi = new ApiGatewayManagementApiClient({
    endpoint: callbackUrl
  });

  const postData = JSON.parse(event.body).data;
  console.log(`Will send POST data to APIGW: ${postData}`);

  for (const connection of connectionDataResponse.Items) {
    const connectionId = connection.connectionId.S;
    console.log(`Trying to send data for connection: ${connectionId}`);
    try {
      const command = new PostToConnectionCommand({ ConnectionId: connectionId, Data: postData });
      await apigwManagementApi.send(command);
      console.log(`Sent ${postData} to ${connectionId}`);
    } catch (e) {
      if (e instanceof GoneException) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        const deleteCommand = new DeleteCommand({ TableName: TABLE_NAME, Key: { connectionId } });
        await docClient.send(deleteCommand);
      } else {
        console.error(`Received error when sending to ${callbackUrl}`, e);
        throw e;
      }
    }
  }

  return { statusCode: 200, body: 'Data sent.' };
};
