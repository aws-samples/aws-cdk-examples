from aws_cdk import (
    aws_efs as efs,
    aws_ec2 as ec2,
    core
    )


class StorageStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, props, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        elasticfilestore = efs.CfnFileSystem(
                self, "efs-storage",
                encrypted=False,
                lifecycle_policies=None
                )

        sg_efs = ec2.SecurityGroup(
                self,
                id="sg_efs",
                vpc=props['vpc'],
                security_group_name="sg_efs"
                )

        sg_efs.add_ingress_rule(
                peer=ec2.Peer.ipv4("10.0.0.0/16"),
                connection=ec2.Port.tcp(2049)
                )
