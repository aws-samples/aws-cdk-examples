import hashlib
import json
import urllib
from dataclasses import dataclass
from email.message import Message

import boto3

client = boto3.client('s3')


@dataclass
class Response:
    status: int
    headers: Message
    body: str


def handler(event, context):
    event_object = event["getObjectContext"]
    s3_url = event_object["inputS3Url"]

    request = urllib.request.Request(
        s3_url, method="GET"
    )

    try:
        with urllib.request.urlopen(request) as response:
            response = Response(
                status=response.status,
                headers=response.headers,
                body=response.read().decode(response.headers.get_content_charset("utf-8")),
            )
    except urllib.error.HTTPError as e:
        response = Response(
            status=e.code,
            headers=e.headers,
            body=str(e.reason),
        )

    if response.status != 200:
        # Write object back to S3 Object Lambda with an error
        output_response = client.write_get_object_response(
            RequestRoute=event_object["outputRoute"],
            RequestToken=event_object["outputToken"],
            StatusCode=400,
            ErrorCode="SomethingWentWrong", ErrorMessage=response.body)
    else:
        # Transform object to the desired result if the object retrieval was successful
        transformed_object = {
            "metadata": {
                "length": len(response.body),
                "md5": hashlib.md5(response.body.encode()).hexdigest(),
                "sha1": hashlib.sha1(response.body.encode()).hexdigest(),
                "sha256": hashlib.sha256(response.body.encode()).hexdigest()
            }
        }

        # Write object back to S3 Object Lambda with the transformed object
        output_response = client.write_get_object_response(
            RequestRoute=event_object["outputRoute"],
            RequestToken=event_object["outputToken"],
            Body=json.dumps(transformed_object),
        )

    print(f"Response: {json.dumps(output_response)}")
    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Success" if response.status == 200 else "Failed"
        })
    }
