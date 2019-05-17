const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const processResponse = require('./process-response.js');

export const handler = async (event: any = {}) : Promise <any> => {

  const requestedItemId = event.pathParameters.id;
  if (!requestedItemId) {
      return Promise.resolve(processResponse(true, `Error: You missing the id parameter`, 400));
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: requestedItemId
    }
  };

  try {
    const response = await db.get(params).promise();
    return processResponse(true, response.Item);
  } catch (dbError) {
    return processResponse(true, dbError, 500);
  }
};
