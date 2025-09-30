from cdklabs.cdk_verified_permissions import (
    Policy,
    PolicyDefinitionProperty,
    StaticPolicyDefinitionProperty,
)


def create_admin_policy(construct, policy_store, user_pool_id):
    """Create and attach a admin policy to the given policy store.
    Args:
        construct: The CDK construct to attach the policy to.
        policy_store: The Verified Permissions Policy Store to attach the policy to.
        user_pool_id: The Cognito User Pool to use in the policy.
    """
    Policy(
        construct,
        "AdminPolicy",
        definition=PolicyDefinitionProperty(
            static=StaticPolicyDefinitionProperty(
                statement=f"""permit (
                principal in amazonverified::UserGroup::"{user_pool_id}|admin",
                action in [amazonverified::Action::"get /admin", amazonverified::Action::"get /user"],
                resource
                );""",
                description="Policy defining permissions for admin group",
            )
        ),
        policy_store=policy_store,
    )
