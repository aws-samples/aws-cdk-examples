
from aws_cdk import (
  aws_iam as iam,
  aws_rds as rds,
  aws_sqs as sqs,
  aws_sns as sns,
  aws_ec2 as ec2,
  aws_s3  as s3,
  aws_logs as logs,
  aws_kms as kms,
  aws_cloudwatch         as cloudwatch,
  aws_cloudwatch_actions as cloudwatch_actions,
  aws_secretsmanager    as secretsmanager,
  aws_s3_notifications  as s3n,
  aws_sns_subscriptions as subs,
  aws_lambda            as lfn,
  Aspects, CfnOutput, Stack, SecretValue, Tags, Fn, Aws, CfnMapping, Duration, RemovalPolicy,
  App, RemovalPolicy
)

from constructs import Construct

import re
import os

from cdk_nag import ( AwsSolutionsChecks, NagSuppressions )

class Aurora(Stack):

  def __init__(self, scope:Construct, id:str,
                vpc_id:str,                 ## vpc id
                subnet_ids:list,            ## list of subnet ids
                db_name:str,                ## database name
                instance_type = None,       ## ec2.InstanceType
                replica_instances:int = 2,  ## At least 1. Default 2
                aurora_cluster_username:str="clusteradmin",
                backup_retention_days:int=14,
                backup_window:str="00:15-01:15",
                preferred_maintenance_window:str="Sun:23:45-Mon:00:15",
                engine:str="postgresql",    ## Aurora Database Engine: postgresql or mysql
                enable_babelfish:bool=True, ## Support for MSSQL. (no extra cost)
                ingress_sources:list=[],    ## A security group object or a network subnet
                                            ##   ec2.Peer.ipv4("0.0.0.0/0")
                                            ##   ec2.SecurityGroup
                **kwargs) -> None:
    super().__init__(scope, id, **kwargs)


    if engine not in ["postgresql", "mysql"]:
      print("Unknown Engine")
      exit(1)

    ##
    ## Enforce a minimum backup retention period
    ##
    if backup_retention_days < 14:
      backup_retention_days = 14

    ##
    ## Enforce a minimum number of read replicas
    ##
    if replica_instances < 1:
      replica_instances = 1

    ############################################
    ##
    ## CDK Nag - https://pypi.org/project/cdk-nag/
    ##           https://github.com/cdklabs/cdk-nag
    ##
    ## CDK Nag Checks for AWS Engagement Solutions Secuirty Rules:
    ##   https://github.com/cdklabs/cdk-nag/blob/main/RULES.md#awssolutions
    ## Also checks for:
    ##   HIPAA Security
    ##   NIST 800-53 rev 4
    ##   NIST 800-53 rev 5
    ##
    ############################################
    Aspects.of(self).add(AwsSolutionsChecks())
    ##
    ## Supressed Errors
    ##
    NagSuppressions.add_stack_suppressions(self, [{"id":"AwsSolutions-IAM4", "reason":"TODO: Stop using AWS managed policies."}])
    NagSuppressions.add_stack_suppressions(self, [{"id":"AwsSolutions-IAM5", "reason":"TODO: Remove Wildcards in IAM roles."}])
    ##
    ## Supressed Warnings
    ##
    NagSuppressions.add_stack_suppressions(self, [{"id":"AwsSolutions-RDS16", "reason":"parameter referencing an intrinsic function"}])



    azs = Fn.get_azs()

    vpc = ec2.Vpc.from_vpc_attributes(self, 'ExistingVPC', availability_zones=azs, vpc_id=vpc_id)
    subnets = list()
    for subnet_id in subnet_ids:
      subnets.append(ec2.Subnet.from_subnet_attributes(self, subnet_id.replace("-", "").replace("_", "").replace(" ", ""), subnet_id=subnet_id))

    vpc_subnets = ec2.SubnetSelection(subnets=subnets)





    allAll = ec2.Port(protocol=ec2.Protocol("ALL"), string_representation="ALL")
    tcp3306 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=3306, to_port=3306, string_representation="tcp3306 MySQL")
    tcp5432 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=5432, to_port=5432, string_representation="tcp5432 PostgreSQL")
    tcp1433 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=1433, to_port=1433, string_representation="tcp1433 MSSQL")



    ##
    ## Database Security Group
    ##
    dbsg = ec2.SecurityGroup(self, "DatabaseSecurityGroup",
             vpc = vpc,
             allow_all_outbound = True,
             description = id + " Database",
             security_group_name = id + " Database",
           )
    dbsg.add_ingress_rule(
      peer =dbsg,
      connection =allAll,
      description="all from self"
    )
    dbsg.add_egress_rule(
      peer =ec2.Peer.ipv4("0.0.0.0/0"),
      connection =allAll,
      description="all out"
    )

    if engine == "mysql":
      connection_port = tcp3306
      connection_name = "tcp3306 MySQL"
    else:
      connection_port = tcp5432
      connection_name = "tcp5432 PostgreSQL"

    for ingress_source in ingress_sources:
      dbsg.add_ingress_rule(
        peer =ingress_source,
        connection =connection_port,
        description=connection_name
      )
      if engine == "postgresql":
        dbsg.add_ingress_rule(
          peer =ingress_source,
          connection =tcp1433,
          description="tcp1433 MSSQL"
        )

    db_subnet_group = rds.SubnetGroup(self,
                       id = "DatabaseSubnetGroup",
                       vpc = vpc,
                       description = id + " subnet group",
                       vpc_subnets = vpc_subnets,
                       subnet_group_name=id + "subnet group"
    )


    ##
    ## use PostgreSQL by default
    ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/AuroraPostgresEngineVersion.html#aws_cdk.aws_rds.AuroraPostgresEngineVersion
    ##
    aurora_engine = rds.DatabaseClusterEngine.aurora_postgres(version=rds.AuroraPostgresEngineVersion.VER_13_4)

    ##
    ## include support for MySQL
    ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/AuroraMysqlEngineVersion.html#aws_cdk.aws_rds.AuroraMysqlEngineVersion
    ##
    if engine == "mysql":
      aurora_engine = rds.DatabaseClusterEngine.aurora_mysql(version=rds.AuroraMysqlEngineVersion.VER_2_10_1)

    aurora_parameters = {}
    ## If PostgreSQL, and enable_babelfish is True, turn on Babelfish support.
    if enable_babelfish and engine=="postgresql":
      aurora_parameters["rds.babelfish_status"] = "on"

    aurora_parameter_group = rds.ParameterGroup(self, id="AuroraParameterGroup", 
      engine =aurora_engine, 
      description=id + " Parameter Group", 
      parameters =aurora_parameters)


    
    ##
    ## Secret username/password for the cluster.
    ##
    aurora_cluster_secret = secretsmanager.Secret(self, "AuroraClusterCredentials",
      secret_name =db_name + "AuroraClusterCredentials",
      description =db_name + "Aurora Cluster Credentials",
      generate_secret_string=secretsmanager.SecretStringGenerator(
        exclude_characters ="\"@/\\ '",
        generate_string_key ="password",
        password_length =30,
        secret_string_template='{"username":"'+aurora_cluster_username+'"}'),
    )

    aurora_cluster_credentials = rds.Credentials.from_secret(aurora_cluster_secret, aurora_cluster_username)

    ##
    ## Default Instance Type
    ##
    if not instance_type:
      instance_type = ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MEDIUM)

    kms_key = kms.Key(self, "AuroraDatabaseKey",
      enable_key_rotation=True,
      alias=db_name
    )


    ##
    ## https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.CloudWatch.html
    ##
    ## If PostgreSQL, export the postgresql log.
    cloudwatch_logs_exports=["postgresql"]
    ## If MySQL, export the slowquery log.
    if engine == "mysql":
      cloudwatch_logs_exports=["slowquery"]


    aurora_cluster = rds.DatabaseCluster(self, "AuroraDatabase",
        engine = aurora_engine,
        credentials = aurora_cluster_credentials, # Optional - will default to 'admin' username and generated password
        backup = rds.BackupProps(
          retention =Duration.days(backup_retention_days),
          preferred_window =backup_window
        ),
        parameter_group = aurora_parameter_group,
        instances = replica_instances,
        iam_authentication = True,
        storage_encrypted = True,
        storage_encryption_key = kms_key,
        deletion_protection=True,
        removal_policy=RemovalPolicy.SNAPSHOT,
        copy_tags_to_snapshot=True,
        cloudwatch_logs_exports=cloudwatch_logs_exports,
        cloudwatch_logs_retention=logs.RetentionDays.ONE_MONTH,
        preferred_maintenance_window=preferred_maintenance_window, # Should be specified as a range ddd:hh24:mi-ddd:hh24:mi (24H Clock UTC).
                                                                   # Example: Sun:23:45-Mon:00:15
                                                                   # Default: 30-minute window selected at random from an 8-hour block of time for each AWS Region, 
                                                                   #          occurring on a random day of the week.
        #cluster_identifier=db_name,
        instance_identifier_base = db_name,
        instance_props = {
            "instance_type": instance_type,
            "vpc_subnets": vpc_subnets,
            "vpc": vpc,
            "security_groups": [dbsg],
        } ## instance_props
    ) ## rds.DatabaseCluster
    aurora_cluster.apply_removal_policy(RemovalPolicy.RETAIN)
    Tags.of(aurora_cluster).add("Name", db_name, priority=300)

    aurora_cluster.add_rotation_single_user(
      automatically_after=Duration.days(30),
      exclude_characters ="\"@/\\ '",
      vpc_subnets=vpc_subnets
    )






    ##
    ## Cloudwatch Dashboard
    ##
    dashboard = cloudwatch.Dashboard(self, "AuroraMonitoringDashboard",
                  dashboard_name=db_name)

    db_connections = aurora_cluster.metric_database_connections()
    cpu_utilization = aurora_cluster.metric_cpu_utilization()
    deadlocks = aurora_cluster.metric_deadlocks()
    free_local_storage = aurora_cluster.metric_free_local_storage()
    freeable_memory = aurora_cluster.metric_freeable_memory()
    network_receive_throughput = aurora_cluster.metric_network_receive_throughput()
    network_throughput = aurora_cluster.metric_network_throughput()
    network_transmit_throughput = aurora_cluster.metric_network_transmit_throughput()
    snapshot_storage_used = aurora_cluster.metric_snapshot_storage_used()
    total_backup_storage_billed = aurora_cluster.metric_total_backup_storage_billed()
    volume_bytes_used = aurora_cluster.metric_volume_bytes_used()
    volume_read_io_ps = aurora_cluster.metric_volume_read_io_ps()
    volume_write_io_ps = aurora_cluster.metric_volume_write_io_ps()

    # The average amount of time taken per disk I/O operation (average over 1 minute)
    read_latency = aurora_cluster.metric("ReadLatency", statistic="Average", period=Duration.seconds(60))

    percent90 = cloudwatch.HorizontalAnnotation(
                  value =85,
                  color =cloudwatch.Color.RED,
                  fill =cloudwatch.Shading('NONE'),
                  label ="🚨 DANGER")

    percent80 = cloudwatch.HorizontalAnnotation(
                  value =75,
                  color =cloudwatch.Color.ORANGE,
                  fill =cloudwatch.Shading('NONE'),
                  label ="⚠️ WARNING")

    widget_db_connections = cloudwatch.GraphWidget(
                title="DB Connections",
                # Metrics to display on left Y axis.
                left =[db_connections],
                #left_annotations = [percent90, percent80],
              ) ## GraphWidget

    widget_cpu_utilization = cloudwatch.GraphWidget(
                title="CPU Utilization",
                # Metrics to display on left Y axis.
                left =[cpu_utilization],
                #left_annotations = [percent90, percent80],
              ) ## GraphWidget

    widget_read_latency = cloudwatch.GraphWidget(
                title="Read Latency",
                # Metrics to display on left Y axis.
                left =[read_latency],
                #left_annotations = [percent90, percent80],
              ) ## GraphWidget


    deadlocks = aurora_cluster.metric_deadlocks()
    free_local_storage = aurora_cluster.metric_free_local_storage()
    freeable_memory = aurora_cluster.metric_freeable_memory()
    network_receive_throughput = aurora_cluster.metric_network_receive_throughput()
    network_throughput = aurora_cluster.metric_network_throughput()
    network_transmit_throughput = aurora_cluster.metric_network_transmit_throughput()

    total_backup_storage_billed = aurora_cluster.metric_total_backup_storage_billed()

    volume_bytes_used = aurora_cluster.metric_volume_bytes_used()
    snapshot_storage_used = aurora_cluster.metric_snapshot_storage_used()

    volume_read_io_ps = aurora_cluster.metric_volume_read_io_ps()
    volume_write_io_ps = aurora_cluster.metric_volume_write_io_ps()

    widget_deadlocks = cloudwatch.GraphWidget(title="Deadlocks", left=[deadlocks])
    widget_free_local_storage = cloudwatch.GraphWidget(title="Free Local Storage", left=[free_local_storage])
    widget_freeable_memory = cloudwatch.GraphWidget(title="Freeable Memory", left=[freeable_memory])
    widget_network_receive_throughput = cloudwatch.GraphWidget(title="Network Throughput", left=[network_receive_throughput, network_throughput, network_transmit_throughput])
    widget_total_backup_storage_billed = cloudwatch.GraphWidget(title="Backup Storage Billed", left=[total_backup_storage_billed])
    widget_volume_bytes = cloudwatch.GraphWidget(title="Storage", left=[volume_bytes_used, snapshot_storage_used])
    widget_volume_iops = cloudwatch.GraphWidget(title="Volume IOPs", left=[volume_read_io_ps, volume_write_io_ps])


    ##
    ## Each dashboard.add() creates a single row in the dashboard.
    ##
    dashboard.add_widgets(
      widget_db_connections,
      widget_cpu_utilization
    )
    dashboard.add_widgets(
      widget_total_backup_storage_billed,
      widget_free_local_storage
    )
    dashboard.add_widgets(
      widget_freeable_memory,
      widget_volume_bytes,
      widget_volume_iops,
    )
    dashboard.add_widgets(
      widget_network_receive_throughput,
      widget_read_latency,
      widget_deadlocks,
    )




    CfnOutput(self, "OutputSecretName", export_name=aurora_cluster.stack.stack_name+":SecretName", value=aurora_cluster.secret.secret_name) # isecret
    CfnOutput(self, "OutputSecretArn", export_name=aurora_cluster.stack.stack_name+":SecretArn", value=aurora_cluster.secret.secret_arn) # isecret
    CfnOutput(self, "OutputGetSecretValue", export_name=aurora_cluster.stack.stack_name+":GetSecretValue", value="aws secretsmanager get-secret-value --secret-id "+aurora_cluster.secret.secret_arn)

    CfnOutput(self, "OutputIntanceIdentifiers", export_name=aurora_cluster.stack.stack_name+":IntanceIdentifiers", value=str(aurora_cluster.instance_identifiers)) # list
    instance_endpoints = []
    for ie in aurora_cluster.instance_endpoints:
      instance_endpoints.append(ie.hostname)
    CfnOutput(self, "OutputEndpoints", export_name=aurora_cluster.stack.stack_name+":Endpoints", value=str(instance_endpoints)) # list
    CfnOutput(self, "OutputClusterEndpoint", export_name=aurora_cluster.stack.stack_name+":Endpoint", value=aurora_cluster.cluster_endpoint.socket_address) # list

    CfnOutput(self, "OutputEngineFamily", export_name=aurora_cluster.stack.stack_name+":EngineFamily", value=aurora_cluster.engine.engine_family) # iclusterengine
    CfnOutput(self, "OutputEngineType", export_name=aurora_cluster.stack.stack_name+":EngineType", value=aurora_cluster.engine.engine_type) # iclusterengine
    CfnOutput(self, "OutputEngineFullVersion", export_name=aurora_cluster.stack.stack_name+":EngineFullVersion", value=aurora_cluster.engine.engine_version.full_version) # iclusterengine
    CfnOutput(self, "OutputEngineMajorVersion", export_name=aurora_cluster.stack.stack_name+":EngineMajorVersion", value=aurora_cluster.engine.engine_version.major_version) # iclusterengine
    CfnOutput(self, "OutputParameterGroupFamily", export_name=aurora_cluster.stack.stack_name+":ParameterGroupFamily", value=aurora_cluster.engine.parameter_group_family)






class IcePlainsOfHoth(Stack):

  def __init__(self, scope:Construct, id:str, **kwargs) -> None:
    super().__init__(scope, id, **kwargs)

    vpc = ec2.Vpc(self, "IcePlainsVpc",
      cidr                 = "10.99.0.0/16",
      max_azs              = 3,
      enable_dns_hostnames = True,
      enable_dns_support   = True,
      subnet_configuration = [
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public1',
          subnet_type = ec2.SubnetType.PUBLIC,
        ),
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public2',
          subnet_type = ec2.SubnetType.PUBLIC,
        ),
        ec2.SubnetConfiguration(
          cidr_mask   = 24,
          name        = 'public3',
          subnet_type = ec2.SubnetType.PUBLIC,
        )
      ]
    )

    vpc_subnets = vpc.select_subnets(
      subnet_type=ec2.SubnetType.PUBLIC,
      one_per_az =True
    )

    subnet_ids = []
    for subnet in vpc_subnets.subnets:
      subnet_ids.append(subnet.subnet_id)

    vpc_id = vpc.vpc_id

    Aurora(self, "EchoBaseDb",
      db_name="EchoBase",
      ingress_sources=[ec2.Peer.ipv4("10.10.10.10/32")],
      vpc_id=vpc_id,
      subnet_ids=subnet_ids,
      env={'region': 'us-east-1'},
      description="Echo Base DB")


app = App()
# Call the stack on its own
Aurora(app, "Aurora", env={"region":"us-east-1"}, description="Aurora Cluster",
  vpc_id    = "vpc-aaaaaaaa",
  subnet_ids=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
  db_name="sampledb"
)
# Use the construct in a sample stack
IcePlainsOfHoth(app, "IcePlainsOfHoth", env={"region":"us-east-1"}, description="Ice Plains of Hoth")
app.synth()
