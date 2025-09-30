from cdklabs.cdk_verified_permissions import (
    PolicyStore,
    ValidationSettingsMode,
    DeletionProtectionMode,
    IdentitySourceConfiguration,
    IdentitySource,
    CognitoUserPoolConfiguration,
    CognitoGroupConfiguration,
)
from aws_cdk import NestedStack
from constructs import Construct
from .schema import cedar_schema
from .policy import (
    create_admin_policy,
    create_user_policy,
)


class VerifiedPermissionsNested(NestedStack):
    """A Verified Permissions nested stack.
    A nested stack that sets up an Amazon Verified Permissions policy store,
    configures it to use a Cognito user pool as an identity source, and adds
    the necessary policies.

    Attributes:
        scope (Construct): The scope in which this construct is defined.
        id (str): The construct ID.
        user_pool: The Cognito user pool to be used as an identity source.
        kwargs: Additional keyword arguments for the NestedStack.
        policy_store (PolicyStore): The Verified Permissions policy store.
    """

    def __init__(self, scope: Construct, id: str, user_pool, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        user_pool_id = user_pool.user_pool_id
        validation_settings_strict = {"mode": ValidationSettingsMode.STRICT}

        self.policy_store = PolicyStore(
            self,
            "PolicyStore",
            schema=cedar_schema,
            validation_settings=validation_settings_strict,
            description="Policy store",
            deletion_protection=DeletionProtectionMode.DISABLED,
        )

        # Configure identity provider
        IdentitySource(
            self,
            "IdentitySource",
            configuration=IdentitySourceConfiguration(
                cognito_user_pool_configuration=CognitoUserPoolConfiguration(
                    user_pool=user_pool,
                    group_configuration=CognitoGroupConfiguration(
                        group_entity_type="amazonverified::UserGroup"
                    ),
                )
            ),
            policy_store=self.policy_store,
            principal_entity_type="amazonverified::User",
        )

        # Add policies
        create_user_policy(self, self.policy_store, user_pool_id)
        create_admin_policy(self, self.policy_store, user_pool_id)

    @property
    def policy_store_id(self):
        """Return the policy store ID."""
        return self.policy_store.policy_store_id
