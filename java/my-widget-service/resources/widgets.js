const { S3 } = require("@aws-sdk/client-s3");
const s3 = new S3();

const bucketName = process.env.BUCKET;

exports.main = async function(event, context) {
  try {
    var method = event.httpMethod;
    // Get name, if present
    var widgetName = event.path.startsWith('/') ? event.path.substring(1) : event.path;

    if (method === "GET") {
      // GET / to get the names of all widgets
      if (event.path === "/") {
        const data = await s3.listObjectsV2({ Bucket: bucketName });
        var body = {
          widgets: data.Contents.map(function(e) { return e.Key })
        };
        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify(body)
        };
      }

      if (widgetName) {
        // GET /name to get info on widget name
        const data = await s3.getObject({ Bucket: bucketName, Key: widgetName});
        var body = await data.Body.transformToString();

        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify(body)
        };
      }
    }

    if (method === "POST") {
      // POST /name
      // Return error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {},
          body: "Widget name missing"
        };
      }

      // Create some dummy data to populate object
      const now = new Date();
      var data = widgetName + " created: " + now;

      var base64data = new Buffer(data, 'binary');

      await s3.putObject({
        Bucket: bucketName,
        Key: widgetName,
        Body: base64data,
        ContentType: 'application/json'
      });

      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(event.widgets)
      };
    }

    if (method === "DELETE") {
      // DELETE /name
      // Return an error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {},
          body: "Widget name missing"
        };
      }

      await s3.deleteObject({
        Bucket: bucketName, Key: widgetName
      });

      return {
        statusCode: 200,
        headers: {},
        body: "Successfully deleted widget " + widgetName
      };
    }

    // We got something besides a GET, POST, or DELETE
    return {
      statusCode: 400,
      headers: {},
      body: "We only accept GET, POST, and DELETE, not " + method
    };
  } catch(error) {
    var body = error.stack || JSON.stringify(error, null, 2);
    return {
      statusCode: 400,
      headers: {},
      body: body
    }
  }
}
