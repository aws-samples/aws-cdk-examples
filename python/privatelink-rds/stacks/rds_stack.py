from aws_cdk import (
    core,
    aws_ec2 as ec2,
    aws_rds as rds
)

class RdsStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, 
        vpc, 
        vpc_cidr, 
        db_port, 
        subnet_group, 
        sns_topic_arn, 
        **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # Create the security group for NLB to connect
        self.db_sg = ec2.SecurityGroup(self, "PrivatelinkRdsDemoDbSg",
            vpc = vpc,
            security_group_name = "PrivatelinkRdsDemoDbSg"
        )
        
        # Allow VPC CIDR to connect on DB port
        # Security note: This VPC is small and only to host this database, NLB, and VPC service endpoint.
        # More secure method is to look up the subnets of the NLB and allow those CIDRs
        # or just the IPs of the created NLB ENIs.
        self.db_sg.add_ingress_rule(
            peer = ec2.Peer.ipv4(vpc_cidr),
            connection = ec2.Port.tcp(db_port)
        )
        
        # Allow this security group to connect back to itself on DB port
        # NOT NEEDED, used for debugging to attach an EC2 instance to for testing traffic
#         self.db_sg.add_ingress_rule(
#             peer = self.db_sg,
#             connection = ec2.Port.tcp(db_port)
#         )
        
        # Create the RDS instance
        self.db = rds.DatabaseInstance(self, "PrivatelinkRdsDemoDb",
            engine = rds.DatabaseInstanceEngine.mysql(
                version = rds.MysqlEngineVersion.VER_5_7_30
            ),
            instance_type = ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
            vpc = vpc,
            security_groups = [self.db_sg],
            vpc_subnets = ec2.SubnetSelection(subnet_group_name = subnet_group),
            multi_az = True,
            allocated_storage = 100,
            storage_type = rds.StorageType.GP2,
            cloudwatch_logs_exports = ["audit", "error", "general", "slowquery"],
            deletion_protection = False,
            delete_automated_backups = False,
            backup_retention = core.Duration.days(7),
            parameter_group = rds.ParameterGroup.from_parameter_group_name(
                self, "para-group-mysql",
                 parameter_group_name = "default.mysql5.7"
            )
        )
        
        # Create the event notification for cluster events (to trigger Lambda)
        event_topic = rds.CfnEventSubscription(self, "PrivatelinkRdsDemoEvent",
            sns_topic_arn = sns_topic_arn,
            event_categories = ['failover', 'failure', 'recovery', 'maintenance'],
            source_type = 'db-instance',
            source_ids = [self.db.instance_identifier]
        )