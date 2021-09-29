const helper = require('helper');

const handler = async function (event, context) {
  console.log('Lambda running');
  console.log(helper.layerFunction())

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/json" },
    body: 'Hello world!'
  };
}

module.exports = { handler }
