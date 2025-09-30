from cdklabs.cdk_verified_permissions import (
    Policy,
    PolicyDefinitionProperty,
    StaticPolicyDefinitionProperty,
)


def create_user_policy(construct, policy_store, user_pool_id):
    """Create and attach a user policy to the given policy store.
    Args:
        construct: The CDK construct to attach the policy to.
        policy_store: The Verified Permissions Policy Store to attach the policy to.
        user_pool_id: The Cognito User Pool to use in the policy.
    """
    Policy(
        construct,
        "UserPolicy",
        definition=PolicyDefinitionProperty(
            static=StaticPolicyDefinitionProperty(
                statement=f"""permit (
                    principal in amazonverified::UserGroup::"{user_pool_id}|user",
                    action in
                    [
                        amazonverified::Action::"get /user",
                        amazonverified::Action::"get /"
                    ],
                    resource
                );""",
                description="Policy defining permissions for user group",
            )
        ),
        policy_store=policy_store,
    )
