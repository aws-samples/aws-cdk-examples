// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  S3Client,
  GetBucketNotificationConfigurationCommand,
  PutBucketNotificationConfigurationCommand
} from "@aws-sdk/client-s3";
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const url = require('url');
const https = require('https');

exports.handler = async function (event, context) {
    log(JSON.stringify(event, undefined, 2));
    try {
        const props = event.ResourceProperties;
        const getParams = {
            Bucket: props.BucketName
        };
        const getBucketNotConfig = new GetBucketNotificationConfigurationCommand(getParams);

        // const currentConfiguration = await getBucketNotificationConfiguration(getParams).promise();
      const currentConfiguration = await s3Client.send(getBucketNotConfig);
        const mergedConfiguration = mergeConfigurations(event.RequestType, props.NotificationConfiguration, currentConfiguration)
        const putParams = {
            Bucket: props.BucketName,
            NotificationConfiguration: mergedConfiguration
        }
        log({
          bucket: props.BucketName,
          previousConfiguration: JSON.stringify(currentConfiguration),
          newConfiguration: JSON.stringify(mergedConfiguration)
        });

        const putBucketNotificationCommand = new PutBucketNotificationConfigurationCommand(putParams);
        s3Client.send(putBucketNotificationCommand);
        return await submitResponse('SUCCESS');
    } catch (e) {
        logError(e);
        return await submitResponse('FAILED', e.message + `\nMore information in CloudWatch Log Stream: ${context.logStreamName}`);
    }
    function mergeConfigurations(request, inputConfig, currentConfig) {
        const mergedConfig = {}
        for (const [key, value] of Object.entries(currentConfig)) {
            // Default to use existing configuration
            mergedConfig[key] = value;

            const input = inputConfig[key];
            if (input && input.length) {
                // If input configuration exists, merge it with existing configuration
                const inputIds = new Set(input.map(obj => obj.Id));
                if (request === 'Delete') {
                    mergedConfig[key] = value.filter(obj => !inputIds.has(obj.Id));
                } else {
                    const filterConfig = value.filter(obj => !inputIds.has(obj.Id));
                    mergedConfig[key] = filterConfig.concat(input);
                }
            }
        }
        return mergedConfig;
    }
    async function submitResponse(responseStatus, reason) {
        const responseBody = JSON.stringify({
            Status: responseStatus,
            Reason: reason || 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
            PhysicalResourceId: event.PhysicalResourceId || event.LogicalResourceId,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            NoEcho: false,
        });
        log({ responseBody });
        const parsedUrl = url.parse(event.ResponseURL);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: 'PUT',
            headers: {
                'content-type': '',
                'content-length': responseBody.length,
            },
        };
        return new Promise((resolve, reject) => {
            const request = https.request(options, (res) => {
                log({ statusCode: res.statusCode, statusMessage: res.statusMessage });
                context.done();
            });
            request.on('error', (error) => {
                log({ sendError: error });
                context.done();
            });
            request.write(responseBody);
            request.end();
        });
    }
    function log(obj) {
        console.log(event.RequestId, event.StackId, event.LogicalResourceId, obj);
    }
    function logError(obj) {
        console.error(event.RequestId, event.StackId, event.LogicalResourceId, obj);
    }
};
