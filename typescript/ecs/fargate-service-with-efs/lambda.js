var AWS = require('aws-sdk');
var ecs = new AWS.ECS();

exports.handler = function(event, context, callback) {

    var taskDefParams = {
        taskDefinition: event["ResourceProperties"]["TaskDefinition"],
    };

    var ecsParams = {
        service: event["ResourceProperties"]["EcsService"],
        cluster: event["ResourceProperties"]["EcsCluster"]
    };

    var volume = {
      name: event["ResourceProperties"]["EfsMountName"],
      efsVolumeConfiguration: { fileSystemId: event["ResourceProperties"]["EfsFileSystemId"], rootDirectory: '/' }
    };

    var mountPoint =  {
        sourceVolume: event["ResourceProperties"]["EfsMountName"],
        containerPath: '/' + event["ResourceProperties"]["EfsMountName"],
        readOnly: false
    };

    console.log(event);
    console.log(event["ResourceProperties"]);
    try {
        console.log("Getting Task Definition");
        ecs.describeTaskDefinition(taskDefParams, function(err, data) {
          if (err)
            console.log(err, err.stack);
          else
            data['taskDefinition']['volumes'].push(volume);
            data['taskDefinition']['containerDefinitions'][0]['mountPoints'].push(mountPoint);
            delete data['taskDefinition']['taskDefinitionArn'];
            delete data['taskDefinition']['revision'];
            delete data['taskDefinition']['status'];
            delete data['taskDefinition']['requiresAttributes'];
            delete data['taskDefinition']['compatibilities'];

            console.log("Register New Task Definition");
            ecs.registerTaskDefinition(data['taskDefinition'], function(err, data) {
              if (err)
                console.log(err, err.stack);
              else
                console.log(data);
                console.log("Update Service");
                ecs.updateService({
                      service: ecsParams['service'],
                      cluster: ecsParams['cluster'],
                      taskDefinition: data['taskDefinition']['taskDefinitionArn'],

                    },
                    function (err, data) {
                  if (err)
                      console.log(err, err.stack);
                  else
                      console.log(data);
                      sendResponse(event, context, 'SUCCESS', { 'Message': 'Resource creation successful!' });
                });
                console.log(data);
            });
        });
    } catch (e) {
        console.log('Errors' + e);
        sendResponse(event, context, 'FAILED')
    }
};


// Send response to the pre-signed S3 URL
function sendResponse (event, context, responseStatus, responseData) {
  console.log('Sending response ' + responseStatus);
  var responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log('RESPONSE BODY:\n', responseBody);

  var https = require('https');
  var url = require('url');

  var parsedUrl = url.parse(event.ResponseURL);
  var options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  console.log('SENDING RESPONSE...\n');

  var request = https.request(options, function (response) {
    console.log('STATUS: ' + response.statusCode);
    console.log('HEADERS: ' + JSON.stringify(response.headers));
    // Tell AWS Lambda that the function execution is done
    context.done()
  });

  request.on('error', function (error) {
    console.log('sendResponse Error:' + error);
    // Tell AWS Lambda that the function execution is done
    context.done()
  });

  // write data to request body
  request.write(responseBody);
  request.end()
}
