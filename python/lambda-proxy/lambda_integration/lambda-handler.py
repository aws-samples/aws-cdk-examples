import json


def main(event, context):
    print("I'm running!")
    return {
        "statusCode": 200,
        "headers": {
            "my_header": "my_value"
        },
        "body": json.dumps(event)
    }