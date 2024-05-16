import unittest
from unittest.mock import patch, MagicMock
import boto3
from botocore.exceptions import ClientError

from password_rotator_lambda.password_rotator import rotate_ad_password


class TestPasswordRotator(unittest.TestCase):
    @patch("boto3.client")
    def test_rotate_ad_password_success(self, mock_boto3_client):
        # Test case 1: Success scenario
        mock_secrets_manager = MagicMock()
        mock_directory_service = MagicMock()
        mock_boto3_client.side_effect = [mock_secrets_manager, mock_directory_service]

        # Mock the required functions
        mock_secrets_manager.put_secret_value.return_value = {}
        mock_directory_service.reset_user_password.return_value = {}

        event = {
            "ad_domain_name": "example.com",
            "secrets_manager_arn": "arn:aws:secretsmanager:us-west-2:123456789012:secret:example-secret-ABC123",
        }

        # Update the following assertion if the success message has changed
        result = rotate_ad_password(event, None)
        self.assertIn("Password rotation successful", result)

    @patch("boto3.client")
    def test_rotate_ad_password_secrets_manager_failure(self, mock_boto3_client):
        # Test case 2: Failure scenario (Secrets Manager update failure)
        mock_secrets_manager = MagicMock()
        mock_secrets_manager.put_secret_value.side_effect = ClientError(
            error_response={"Error": {"Code": "InvalidRequestException"}},
            operation_name="PutSecretValue",
        )
        mock_boto3_client.return_value = mock_secrets_manager

        event = {
            "ad_domain_name": "example.com",
            "secrets_manager_arn": "arn:aws:secretsmanager:us-west-2:123456789012:secret:example-secret-ABC123",
        }

        # Update the following assertion if the failure message has changed
        result = rotate_ad_password(event, None)
        self.assertIn("Password rotation failed", result)

    @patch("boto3.client")
    def test_rotate_ad_password_managed_ad_failure(self, mock_boto3_client):
        # Test case 3: Failure scenario (Managed AD update failure)
        mock_secrets_manager = MagicMock()
        mock_directory_service = MagicMock()
        mock_directory_service.reset_user_password.side_effect = ClientError(
            error_response={"Error": {"Code": "EntityDoesNotExistException"}},
            operation_name="ResetUserPassword",
        )
        mock_boto3_client.side_effect = [mock_secrets_manager, mock_directory_service]

        event = {
            "ad_domain_name": "example.com",
            "secrets_manager_arn": "arn:aws:secretsmanager:us-west-2:123456789012:secret:example-secret-ABC123",
        }

        # Update the following assertion if the failure message has changed
        result = rotate_ad_password(event, None)
        self.assertIn("Password rotation failed", result)
