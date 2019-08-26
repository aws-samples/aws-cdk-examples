from aws_cdk import (
    core,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_logs as logs
)

class VpcFlowStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        
        # Setup IAM user for logs
        vpc_flow_role = iam.Role(
            self, 'FlowLog',
            assumed_by=iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
        )

        # Create Cloudwatch log group
        log_group = logs.LogGroup(
            self, 'LogGroup',
            log_group_name='vpc-flow-example',
            retention=logs.RetentionDays('ONE_YEAR'),
            removal_policy=core.RemovalPolicy('DESTROY')
            )

        # Setup VPC resource
        vpc = ec2.Vpc(
            self, 'VpcFlowLogs',
            cidr='10.66.0.0/16',
            max_azs=1
        )
        
        # Setup VPC flow logs
        vpc_log = ec2.CfnFlowLog(
            self, 'FlowLogs',
            resource_id=vpc.vpc_id,
            resource_type='VPC',
            traffic_type='ALL',
            deliver_logs_permission_arn=vpc_flow_role.role_arn,
            log_destination_type='cloud-watch-logs',
            log_group_name=log_group.log_group_name
        )

app = core.App()
VpcFlowStack(app, "MyVpcFlowLogs")
app.synth()
