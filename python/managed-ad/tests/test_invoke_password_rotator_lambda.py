import unittest
from unittest.mock import Mock, patch
import json
from managed_ad.managed_ad_stack import invoke_password_rotator_lambda
from aws_cdk import aws_customresource as custom_resource


class TestInvokePasswordRotatorLambda(unittest.TestCase):
    @patch("managed_ad.managed_ad_stack.lambda_.Function.from_function_arn")
    def test_invoke_password_rotator_lambda_with_valid_params(
        self, mock_lambda_function
    ):
        mock_lambda_instance = Mock()
        mock_lambda_function.return_value = mock_lambda_instance

        valid_directory_id = "valid_directory_id"
        valid_secrets_manager_arn = "valid_secrets_manager_arn"

        invoke_password_rotator_lambda(
            None,
            valid_directory_id,
            valid_secrets_manager_arn,
        )

        mock_lambda_instance.invoke.assert_called_once_with(
            function_request=custom_resource.FunctionInvokingRequest(
                lambda_type=custom_resource.FunctionInvokingRequestType.REQUEST_RESPONSE,
                payload=json.dumps(
                    {
                        "directory_id": valid_directory_id,
                        "secrets_manager_arn": valid_secrets_manager_arn,
                    }
                ),
            )
        )

    @patch("managed_ad.managed_ad_stack.lambda_.Function.from_function_arn")
    def test_invoke_password_rotator_lambda_with_invalid_params(
        self, mock_lambda_function
    ):
        mock_lambda_instance = Mock()
        mock_lambda_function.return_value = mock_lambda_instance

        invalid_directory_id = "invalid_directory_id"
        invalid_secrets_manager_arn = "invalid_secrets_manager_arn"

        with self.assertRaises(Exception):
            invoke_password_rotator_lambda(
                None,
                invalid_directory_id,
                invalid_secrets_manager_arn,
            )
