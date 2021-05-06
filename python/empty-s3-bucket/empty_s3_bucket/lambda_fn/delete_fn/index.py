import uuid
import boto3

s3 = boto3.client('s3')


def handler(event, context):
    print(event)
    bucket_name = event['bucketName']

    next_key_marker = None
    all_versions = []

    next_key_marker, versions = get_versions(bucket_name, next_key_marker)

    for version in versions:
        all_versions.append(version)
        response = s3.delete_objects(
            Bucket=bucket_name,
            Delete={
                'Objects': [
                    {
                        'Key': version['Key'],
                        'VersionId': version['VersionId']
                    },
                ],
                'Quiet': True
            },
        )
        print(f'deleting {version["Key"]}')
        assert 'Errors' not in response
    return {
        'bucketName': bucket_name,
        'guid': str(uuid.uuid4()),
        'wait_time': 1
    }


def get_versions(bucket_name: str, next_key_marker: str = None):
    if next_key_marker:
        response = s3.list_object_versions(
            Bucket=bucket_name,
            KeyMarker=next_key_marker,
            MaxKeys=10
        )
    else:
        response = s3.list_object_versions(
            Bucket=bucket_name,
            MaxKeys=10
        )

    versions = []
    if 'Versions' in response:
        for version in response['Versions']:
            versions.append(version)
    if 'DeleteMarkers' in response:
        for delete_marker in response['DeleteMarkers']:
            versions.append(delete_marker)
    if 'NextKeyMarker' in response:
        next_key_marker = response['NextKeyMarker']

    print(response)

    return next_key_marker, versions

# os.environ['bucket_name'] = '########'
# handler({}, {})
