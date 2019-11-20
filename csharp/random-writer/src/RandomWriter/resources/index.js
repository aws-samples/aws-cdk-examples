const { DynamoDB } = require('aws-sdk');
const crypto = require('crypto');

/**
 * This Lambda event handler expects the name of a DynamoDB table to be passed
 * in the `TABLE_NAME` environment variable. The Lambda function must be granted
 * WRITE permissions on the DynamoDB table (for it will add new items in the
 * table).
 *
 * The DynamoDB table must have a hash-only primary key, where the hash key is
 * named `ID` and is of type STRING.
 */
exports.handler = async function handler(event, context) {
  console.log(JSON.stringify(event, undefined, 2));

  var seed = `${Date.now}${Math.random()}`;
  const id = crypto.createHash('sha1').update(seed).digest('hex');

  const ddb = new DynamoDB();
  await ddb.putItem({
    TableName: process.env.TABLE_NAME,
    Item: {
      ID: { S: id }
    }
  }).promise();
};
