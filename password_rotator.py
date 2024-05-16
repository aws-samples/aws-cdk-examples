import boto3
import os
from password_rotator_lambda.utils import generate_random_password


def rotate_ad_password(event, context):
    directory_id = os.environ["DIRECTORY_ID"]
    secrets_manager_arn = os.environ["SECRETS_MANAGER_ARN"]

    try:
        # Generate a new random password
        new_password = generate_random_password()

        # Update the Secrets Manager secret
        secrets_manager = boto3.client("secretsmanager")
        secrets_manager.put_secret_value(
            SecretId=secrets_manager_arn,
            SecretString=new_password,
        )

        # Update the Managed AD instance with the new password
        directory_service = boto3.client("ds")
        directory_service.reset_user_password(
            UserName="Admin",
            DirectoryId=directory_id,
            NewPassword=new_password,
        )

        return f"Password rotation successful for domain: {directory_id}"
    except Exception as e:
        return f"Password rotation failed: {str(e)}"
