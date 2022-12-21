# This is very very simple lambda function

def handler(event, context):
    print("Hello AWS!")
    print("event = {}".format(event))
    return {
        'statusCode': 200,
        'reponse': 'Hello Lambda'
    }
