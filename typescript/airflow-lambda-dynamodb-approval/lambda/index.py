import json
import datetime


def handler(event, context):
    """Demo Lambda invoked by Airflow to process a payload and return a result."""
    print(f"Received event: {json.dumps(event)}")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "status": "success",
            "processed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "message": event.get("message", "Hello from Lambda!"),
            "request_id": context.aws_request_id,
        }),
    }
