
def handler(event, context):
    # output event to logs
    print(event)

    return {
        'statusCode': 200,
        'body': event
    }
