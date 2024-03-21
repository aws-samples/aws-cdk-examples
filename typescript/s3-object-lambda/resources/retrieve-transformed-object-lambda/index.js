const { S3 } = require('@aws-sdk/client-s3');
const s3 = new S3();
const crypto = require("crypto");
const https = require('https');

function getObjectFromS3(s3Url) {
  return new Promise((resolve, reject) => {
    const req = https.get(s3Url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }
      let body = [];
      res.on('data', function (chunk) {
        body.push(chunk);
      });
      res.on('end', function () {
        try {
          body = Buffer.concat(body).toString();
        } catch (e) {
          reject(e);
        }
        resolve(body);
      });
    });

    req.on('error', (e) => {
      reject(e.message);
    });

    req.end();
  });
}

const handler = async function (event, context) {
  console.log(JSON.stringify(event, undefined, 2));

  const eventObjectContext = event.getObjectContext;
  const s3Url = eventObjectContext.inputS3Url;

  const s3Object = await getObjectFromS3(s3Url);

  const transformedObject = {
    metadata: {
      length: s3Object.length,
      md5: crypto.createHash('md5').update(s3Object).digest('hex'),
      sha1: crypto.createHash('sha1').update(s3Object).digest('hex'),
      sha256: crypto.createHash('sha256').update(s3Object).digest('hex')
    }
  };

  return s3.writeGetObjectResponse({
    RequestRoute: eventObjectContext.outputRoute,
    RequestToken: eventObjectContext.outputToken,
    Body: JSON.stringify(transformedObject)
  });
};


module.exports = {handler}
