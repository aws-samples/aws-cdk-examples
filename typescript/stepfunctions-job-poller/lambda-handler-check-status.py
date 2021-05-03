def main(event, context):
    print('The job is submitted successfully!')
    return {'status': event['guid']}