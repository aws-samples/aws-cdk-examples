from aws_cdk import aws_cognito as cognito, cdk


class CognitoChatRoomPool(cdk.Construct):
    def __init__(self, scope: cdk.Construct, id: str) -> None:
        super().__init__(scope, id)

        # Create chat room user pool
        chat_pool = cognito.CfnUserPool(
            self,
            "UserPool",
            admin_create_user_config={"allowAdminCreateUserOnly": False},
            policies={"passwordPolicy": {"minimumLength": 6, "requireNumbers": True}},
            schema=[{"attributeDataType": "String", "name": "email", "required": True}],
            auto_verified_attributes=["email"],
        )

        # Now for the client
        cognito.CfnUserPoolClient(
            self,
            "UserPoolClient",
            client_name="Chat-Room",
            explicit_auth_flows=["ADMIN_NO_SRP_AUTH"],
            refresh_token_validity=30,
            user_pool_id=chat_pool.ref,
        )
