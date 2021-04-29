from enum import Enum
import boto3


class Status(Enum):
    IN_PROGRESS = 'IN_PROGRESS'
    SUCCEEDED = 'SUCCEEDED'
    FAILED = 'FAILED'


s3 = boto3.client('s3')


def handler(event, context):
    bucket_name = event['bucketName']

    status = Status.SUCCEEDED
    response = None

    try:
        response = s3.list_object_versions(
            Bucket=bucket_name,
            MaxKeys=1
        )
        print(response)
    except Exception:
        status = Status.FAILED

    if 'Versions' in response:
        status = Status.IN_PROGRESS
        print('Versions found!')
    if 'DeleteMarkers' in response:
        status = Status.IN_PROGRESS
        print('DeleteMarkers found!')
    if response['IsTruncated']:
        status = Status.IN_PROGRESS
        print('IsTruncated = True!')

    fn_response = {
        'bucketName': bucket_name,
        'guid': event['guid'],
        'wait_time': event['wait_time'],
        'status': status.name
    }

    print(fn_response)

    return fn_response


# os.environ['bucket_name'] = '#########'
# handler({'guid':'ahmed', 'wait_time': 1}, {})
