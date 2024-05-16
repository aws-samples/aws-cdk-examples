import boto3

def generate_random_password(length=32):
    secrets_manager = boto3.client('secretsmanager')
    response = secrets_manager.get_random_password(
        PasswordLength=length
    )
    return response['RandomPassword']
