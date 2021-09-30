def handler(event, context):
    # save event to logs
    print(event)

    return {
        'statusCode': 200,
        'body': event
    }
