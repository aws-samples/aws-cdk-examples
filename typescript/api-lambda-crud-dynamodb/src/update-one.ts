const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const processResponse = require('./process-response.js');

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}) : Promise <any> => {

  if (!event.body) {
    return Promise.resolve(processResponse(true, 'invalid', 400));
  }

  const editedItemId = event.pathParameters.id;
  if (!editedItemId) {
      return Promise.resolve(processResponse(true, 'invalid id specified', 400));
  }

  const editedItem: any = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  const editedItemProperties = Object.keys(editedItem);
  if (!editedItem || editedItemProperties.length < 1) {
      return Promise.resolve(processResponse(true, 'no args provided', 400));
  }

  const firstProperty = editedItemProperties.splice(0,1);
  const params: any = {
      TableName: TABLE_NAME,
      Key: {
        [PRIMARY_KEY]: editedItemId
      },
      UpdateExpression: `set ${firstProperty} = :${firstProperty}`,
      ExpressionAttributeValues: {},
      ReturnValues: 'UPDATED_NEW'
  }
  params.ExpressionAttributeValues[`:${firstProperty}`] = editedItem[`${firstProperty}`];

  editedItemProperties.forEach(property => {
      params.UpdateExpression += `, ${property} = :${property}`;
      params.ExpressionAttributeValues[`:${property}`] = editedItem[property];
  });

  try {
    await db.update(params).promise();
    return processResponse(true);
  } catch (dbError) {
    const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
    DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    return processResponse(true, errorResponse, 500);
  }
};
