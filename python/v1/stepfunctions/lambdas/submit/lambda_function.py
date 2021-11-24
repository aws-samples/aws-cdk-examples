def lambda_handler(event, context):
    # Return the handling result
    return {
        "event": event,
        "status": "SUCCEEDED",
    }