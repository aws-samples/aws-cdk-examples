def main(event, context):
    print('The job is submitted successfully!')
    # Return the handling result
    return {
        "id": event['id'],
        "status": "SUCCEEDED",
    }
