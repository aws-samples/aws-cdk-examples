def main(event, context):
    if event["status"] == "SUCCEEDED":
        return {"status": "SUCCEEDED", "id": event["id"]}
    else:
        return {"status": "FAILED", "id": event["id"]}
