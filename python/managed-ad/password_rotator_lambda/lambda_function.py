# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import logging
import os
import sys
from botocore.exceptions import ClientError
import ldap3

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """Secrets Manager Rotation Template

    This is a template for creating an AWS Secrets Manager rotation lambda

    Args:
        event (dict): Lambda dictionary of event parameters. These keys must include the following:
            - SecretId: The secret ARN or identifier
            - ClientRequestToken: The ClientRequestToken of the secret version
            - Step: The rotation step (one of createSecret, setSecret, testSecret, or finishSecret)

        context (LambdaContext): The Lambda runtime information

    Raises:
        ResourceNotFoundException: If the secret with the specified arn and stage does not exist

        ValueError: If the secret is not properly configured for rotation

        KeyError: If the event parameters do not contain the expected keys

    """
    arn = event["SecretId"]
    token = event["ClientRequestToken"]
    step = event["Step"]

    # Setup the client
    service_client = boto3.client("secretsmanager")
    ds_client = boto3.client('ds')

    # Make sure the version is staged correctly
    metadata = service_client.describe_secret(SecretId=arn)
    if not metadata["RotationEnabled"]:
        logger.error("Secret %s is not enabled for rotation" % arn)
        raise ValueError("Secret %s is not enabled for rotation" % arn)
    versions = metadata["VersionIdsToStages"]
    if token not in versions:
        logger.error(
            "Secret version %s has no stage for rotation of secret %s." % (token, arn)
        )
        raise ValueError(
            "Secret version %s has no stage for rotation of secret %s." % (token, arn)
        )
    if "AWSCURRENT" in versions[token]:
        logger.info(
            "Secret version %s already set as AWSCURRENT for secret %s." % (token, arn)
        )
        return
    elif "AWSPENDING" not in versions[token]:
        logger.error(
            "Secret version %s not set as AWSPENDING for rotation of secret %s."
            % (token, arn)
        )
        raise ValueError(
            "Secret version %s not set as AWSPENDING for rotation of secret %s."
            % (token, arn)
        )

    if step == "createSecret":
        create_secret(service_client, arn, token)

    elif step == "setSecret":
        set_secret(service_client, arn, token)

    elif step == "testSecret":
        test_secret(service_client, arn, token)

    elif step == "finishSecret":
        finish_secret(service_client, arn, token)

    else:
        raise ValueError("Invalid step parameter")


def create_secret(service_client, arn, token):
    """Create the secret

    This method first checks for the existence of a secret for the passed in token. If one does not exist, it will generate a
    new secret and put it with the passed in token.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    Raises:
        ResourceNotFoundException: If the secret with the specified arn and stage does not exist

    """
    # Make sure the current secret exists
    service_client.get_secret_value(SecretId=arn, VersionStage="AWSCURRENT")

    # Now try to get the secret version, if that fails, put a new secret
    try:
        service_client.get_secret_value(
            SecretId=arn, VersionId=token, VersionStage="AWSPENDING"
        )
        logger.info("createSecret: Successfully retrieved secret for %s." % arn)
    except service_client.exceptions.ResourceNotFoundException:
        # Get exclude characters from environment variable
        exclude_characters = (
            os.environ["EXCLUDE_CHARACTERS"]
            if "EXCLUDE_CHARACTERS" in os.environ
            else "/@\"'\\"
        )
        # Generate a random password
        passwd = service_client.get_random_password(
            ExcludeCharacters=exclude_characters
        )

        # Put the secret
        service_client.put_secret_value(
            SecretId=arn,
            ClientRequestToken=token,
            SecretString=passwd["RandomPassword"],
            VersionStages=["AWSPENDING"],
        )
        logger.info(
            "createSecret: Successfully put secret for ARN %s and version %s."
            % (arn, token)
        )


def set_secret(service_client, arn, token):
    """Set the secret

    This method sets the AWSPENDING secret in the AWS Directory Service and updates the admin password.

    Args:
        service_client (client): The Secrets Manager service client
        arn (string): The secret ARN or other identifier
        token (string): The ClientRequestToken associated with the secret version
    """
    try:
        # Get the AWSPENDING secret value from Secrets Manager
        response = service_client.get_secret_value(
            SecretId=arn, VersionStage="AWSPENDING"
        )
        new_password = response["SecretString"]

        # Get the Directory Service client
        ds_client = boto3.client("ds")

        # Get the directory ID from the environment variable
        directory_id = os.environ["DIRECTORY_ID"]

        # Reset the admin password in the Directory Service
        ds_client.reset_user_password(
            DirectoryId=directory_id, UserName="Admin", NewPassword=new_password
        )

        print(f"Successfully updated the admin password for directory {directory_id}")
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            print(f"Error: The secret {arn} was not found in Secrets Manager.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"Error: {e}")


import os
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta


def test_secret(service_client, arn, token):
    """Test the secret

    This method should validate that the AWSPENDING secret works in the service that the secret belongs to. For example, if the secret
    is a database credential, this method should validate that the user can login with the password in AWSPENDING and that the user has
    all of the expected permissions against the database.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    """
    # Get the Directory Service client
    ds_client = boto3.client("ds")

    # Get the directory ID from the environment variable
    directory_id = os.environ["DIRECTORY_ID"]

    # Get the domain controllers from the directory service
    response = ds_client.describe_directory(DirectoryId=directory_id)
    domain_controllers = response["DirectoryDescription"]["DomainControllers"]
    short_name = response["DirectoryDescription"]["ShortName"]

    # Get the new password from secrets manager
    response = service_client.get_secret_value(
            SecretId=arn, VersionStage="AWSPENDING"
        )
    new_password = response["SecretString"]

    # Set connection values
    SERVER_NAME = domain_controllers[0]["DnsIpAddr"]
    DN = short_name
    USERNAME = 'Admin'
    PASSWORD = new_password


    server = ldap.Server(SERVER_NAME)
    connection = ldap.Connection(server, user='{}\\{}'.format(DN, USERNAME), password=PASSWORD)
    connection.open()
    if connection.bind():
        print('Update successful!')
    else:
        print('New password unsuccessful.')
        print(connection.result)
        sys.exit(1)


def finish_secret(service_client, arn, token):
    """Finish the secret

    This method finalizes the rotation process by marking the secret version passed in as the AWSCURRENT secret.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    Raises:
        ResourceNotFoundException: If the secret with the specified arn does not exist

    """
    # First describe the secret to get the current version
    metadata = service_client.describe_secret(SecretId=arn)
    current_version = None
    for version in metadata["VersionIdsToStages"]:
        if "AWSCURRENT" in metadata["VersionIdsToStages"][version]:
            if version == token:
                # The correct version is already marked as current, return
                logger.info(
                    "finishSecret: Version %s already marked as AWSCURRENT for %s"
                    % (version, arn)
                )
                return
            current_version = version
            break

    # Finalize by staging the secret version current
    service_client.update_secret_version_stage(
        SecretId=arn,
        VersionStage="AWSCURRENT",
        MoveToVersionId=token,
        RemoveFromVersionId=current_version,
    )
    logger.info(
        "finishSecret: Successfully set AWSCURRENT stage to version %s for secret %s."
        % (token, arn)
    )
