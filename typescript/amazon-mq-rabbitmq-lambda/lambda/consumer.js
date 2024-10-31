
exports.handler = async function(event) {
  console.log('Received event:', JSON.stringify(event, undefined, 2));
};

/*

You will see the following output in CloudWatch Log Group after running producer.py
{
    "eventSourceArn": "arn:aws:mq:us-west-2:<account-id>:broker:<broker-name>:<broker-id>",
    "rmqMessagesByQueue": {
        "testQueue::/": [
            {
                "basicProperties": {
                    "contentType": null,
                    "contentEncoding": null,
                    "headers": null,
                    "deliveryMode": 2,
                    "priority": null,
                    "correlationId": null,
                    "replyTo": null,
                    "expiration": null,
                    "messageId": null,
                    "timestamp": null,
                    "type": null,
                    "userId": null,
                    "appId": null,
                    "clusterId": null,
                    "bodySize": 13
                },
                "redelivered": true,
                "data": "SGVsbG8gV29ybGQgMQ=="    <-- Base64 Encoding of "Hello World 1"
            },
            {
                "basicProperties": {
                    "contentType": null,
                    "contentEncoding": null,
                    "headers": null,
                    "deliveryMode": 2,
                    "priority": null,
                    "correlationId": null,
                    "replyTo": null,
                    "expiration": null,
                    "messageId": null,
                    "timestamp": null,
                    "type": null,
                    "userId": null,
                    "appId": null,
                    "clusterId": null,
                    "bodySize": 13
                },
                "redelivered": true,
                "data": "SGVsbG8gV29ybGQgMg=="    <-- Base64 Encoding of "Hello World 2"
            },
            {
                "basicProperties": {
                    "contentType": null,
                    "contentEncoding": null,
                    "headers": null,
                    "deliveryMode": 2,
                    "priority": null,
                    "correlationId": null,
                    "replyTo": null,
                    "expiration": null,
                    "messageId": null,
                    "timestamp": null,
                    "type": null,
                    "userId": null,
                    "appId": null,
                    "clusterId": null,
                    "bodySize": 13
                },
                "redelivered": true,
                "data": "SGVsbG8gV29ybGQgMw=="    <-- Base64 Encoding of "Hello World 3"
            }
        ]
    },
    "eventSource": "aws:rmq"
}

 */
