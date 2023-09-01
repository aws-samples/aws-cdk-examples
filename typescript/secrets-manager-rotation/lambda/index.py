# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import logging
import os
import json
import time
import redis

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
    service_client = boto3.client(
        "secretsmanager", endpoint_url=os.environ["SECRETS_MANAGER_ENDPOINT"]
    )

    
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

    logger.info("***STEP IS*** " + step)
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
        try:
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
        except Exception as e:
            logger.error("Unable to put the secret via put_secret_value")
            raise (e)


def set_secret(service_client, arn, token):
    """Set the secret

    This method should set the AWSPENDING secret in the service that the secret belongs to. For example, if the secret is a database
    credential, this method should take the value of the AWSPENDING secret and set the user's password to this value in the database.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    """

    response = service_client.get_secret_value(
        SecretId=arn, VersionId=token, VersionStage="AWSPENDING"
    )

    logger.info("setSecret!")
    logger.info("arn " + arn)
    logger.info("token " + token)

    client = boto3.client("elasticache")

    logger.info("Elasticache client created")
    logger.info("SecretString " + response["SecretString"])

    replicationGroupId = os.environ["replicationGroupId"]

    while not is_cluster_available(client, replicationGroupId):
        time.sleep(3)

    try:
        response = client.modify_replication_group(
            ApplyImmediately=True,
            ReplicationGroupId=replicationGroupId,
            AuthToken=response["SecretString"],
            AuthTokenUpdateStrategy="ROTATE",
        )

        logger.info(response)

        logger.info("setSecret: Successfully set secret for %s." % arn)
    except Exception as e:
        service_client = boto3.client("secretsmanager")

        logger.error(
            "setSecret: Unable to set secret for replication group when calling modify_replication_group"
        )

        raise (e)


def test_secret(service_client, arn, token):
    """Test the secret

    This method should validate that the AWSPENDING secret works in the service that the secret belongs to. For example, if the secret
    is a database credential, this method should validate that the user can login with the password in AWSPENDING and that the user has
    all of the expected permissions against the database.

    In this case, the ElastiCache Redis cluster will have its auth token updated, then a client connection to Redis will be attempted.
    If the connection fails, then the auth token will be reset as a rollback to the AWSCURRENT secret value.

    An exception is raised if the validation fails, and the secret update process never gets to finalize_secret

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    """

    response = service_client.get_secret_value(
        SecretId=arn, VersionId=token, VersionStage="AWSPENDING"
    )

    pending_secret = response["SecretString"]

    logger.info(json.dumps(print(response), indent=4))

    try:
        client = boto3.client("elasticache")
        replicationGroupId = os.environ["replicationGroupId"]

        while not is_cluster_available(client, replicationGroupId):
            time.sleep(5)

        # Attempt to connect to the Redis cluster to validate with the secret
        redis_server = redis.Redis(
            host=os.environ["redis_endpoint"],
            port=os.environ["redis_port"],
            password=pending_secret,
            ssl=True,
        )

        # Validate that the connection is made
        response = redis_server.client_list()

        logger.info(response)
    except Exception as e:
        # If we couldn't connect with the the new auth token, raise an error -- this will cause the whole update process
        # to rollback
        logger.error(
            "test: Unable to set auth token for Redis cluster with secret %s." % arn
        )
        logger.error(e)
        raise (e)

    logger.info("test: Successfully tested secret for %s." % arn)


def finish_secret(service_client, arn, token):
    """Finish the secret

    This method finalizes the rotation process by marking the secret version passed in as the AWSCURRENT secret.

    This method is reached only if the previous stages succeed.

    Args:
        service_client (client): The secrets manager service client

        arn (string): The secret ARN or other identifier

        token (string): The ClientRequestToken associated with the secret version

    Raises:
        ResourceNotFoundException: If the secret with the specified arn does not exist

    """
    # First describe the secret to get the current version
    metadata = service_client.describe_secret(SecretId=arn)
    response = service_client.get_secret_value(
        SecretId=arn, VersionId=token, VersionStage="AWSPENDING"
    )

    replicationGroupId = os.environ["replicationGroupId"]
    client = boto3.client("elasticache")

    while not is_cluster_available(client, replicationGroupId):
        time.sleep(3)

    response = client.modify_replication_group(
        ApplyImmediately=True,
        ReplicationGroupId=replicationGroupId,
        AuthToken=response["SecretString"],
        AuthTokenUpdateStrategy="SET",
    )

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

    # Finalize by setting the secret version stage to current
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


def is_cluster_available(service_client, clusterId):
    response = service_client.describe_replication_groups(
        ReplicationGroupId=os.environ["replicationGroupId"]
    )
    status = response["ReplicationGroups"][0]["Status"]

    return status == "available"
