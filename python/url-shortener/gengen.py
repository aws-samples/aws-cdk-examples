from aws_cdk.core import Construct
from aws_cdk import aws_ecs, aws_ec2


class GenGen(Construct):

    def __init__(self, scope: Construct, id: str, *, vpc: aws_ec2.IVpc, url: str, tps: int):
        super().__init__(scope, id)

        cluster = aws_ecs.Cluster(self, 'cluster', vpc=vpc)
        task_definition = aws_ecs.FargateTaskDefinition(self, 'PingTask')
        task_definition.add_container('Pinger',
                                      image=aws_ecs.ContainerImage.from_asset("pinger"),
                                      environment={'URL': url})

        aws_ecs.FargateService(self, 'service',
                               cluster=cluster,
                               task_definition=task_definition,
                               desired_count=tps)
