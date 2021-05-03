# import json


def handler(event, context):
    # print("request: {}".format(json.dumps(event)))
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "text/plain"},
        "body": f"Hello, CDK 1025! You have hit event={event}",
    }
