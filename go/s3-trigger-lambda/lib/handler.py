def main(event, context):
    # save event to logs
    fileName = event['Records'][0]['s3']['object']['key']
    print(f"Uploaded file name: {fileName}")

    return {
        'statusCode': 200,
        'body': event
    }