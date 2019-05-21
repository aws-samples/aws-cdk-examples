from aws_cdk import (
    aws_ec2 as ec2,
    aws_rds as rds,
    cdk,
)


class RDSCluster(cdk.Stack):

    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:

        super().__init__(scope, id, *kwargs)

        vpc = ec2.VpcNetwork(
            self, 'MyVpc',
            max_a_zs=2
        )

        rds_cluster = rds.DatabaseCluster(
            self, 'RDSCluster01',
            engine=rds.DatabaseClusterEngine('Aurora'),
            master_user={'username': 'admin'},
            instance_props=rds.InstanceProps(
                instanceType=ec2.InstanceType('t2.small'),
                vpc=vpc,
                vpcSubnets=ec2.SubnetType('Public')
            )
        )

app = cdk.App()
RDSCluster(app, "MyFirstRdsCluster")
app.run()
