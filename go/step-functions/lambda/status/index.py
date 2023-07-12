def lambda_handler(event, context):
    if event["status"] == "SUCCEEDED":
        return {"status": "SUCCEEDED", "event": event}
    else:
        return {"status": "FAILED", "event": event}