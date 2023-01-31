import json
from addonepackage import add_one as addonemodule


def lambda_handler(event, context):

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "hello world",
            "result": f"{addonemodule.add_one(5)}"
        }),
    }
