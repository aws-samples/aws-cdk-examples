const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const processResponse = require('./process-response.js');

export const handler = async () : Promise <any> => {

  let params = {
    TableName: TABLE_NAME
  }

  try {
    const response = await db.scan(params).promise();
    return processResponse(true, response.Items);
  } catch (dbError) {
    return processResponse(true, dbError, 500);
  }
};
