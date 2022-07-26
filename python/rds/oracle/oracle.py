
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

from cdk_nag import ( AwsSolutionsChecks, NagSuppressions )

class Oracle(Stack):

  def __init__(self, scope:Construct, id:str,
                vpc_id:str,                 ## vpc id
                subnet_ids:list,            ## list of subnet ids
                db_name:str,                ## database name
                instance_type = ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE), ## ec2.InstanceType
                ##
                ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/OracleEngineVersion.html#aws_cdk.aws_rds.OracleEngineVersion
                ##
                engine_version = rds.OracleEngineVersion.VER_19_0_0_0_2021_04_R1,
                oracle_username:str="dbadmin",
                backup_retention_days:int=14,
                backup_window:str="00:15-01:15",
                preferred_maintenance_window:str="Sun:23:45-Mon:00:15",
                ingress_sources:list=[],    ## A security group object or a network subnet
                                            ##   ec2.Peer.ipv4("0.0.0.0/0")
                                            ##   ec2.SecurityGroup
                **kwargs) -> None:
    super().__init__(scope, id, **kwargs)



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
    NagSuppressions.add_stack_suppressions(self, [{"id":"AwsSolutions-RDS11","reason":"Default Oracle ports is fine."}])
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

    allAll  = ec2.Port(protocol=ec2.Protocol("ALL"), string_representation="ALL")
    tcp1521 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=1521, to_port=1521, string_representation="tcp1521 Oracle")
    tcp1526 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=1526, to_port=1526, string_representation="tcp1526 Oracle")
    tcp1575 = ec2.Port(protocol=ec2.Protocol("TCP"), from_port=1575, to_port=1575, string_representation="tcp1575 Oracle")


    dbsg = ec2.SecurityGroup(self, "DatabaseSecurityGroup",
             vpc                 = vpc,
             allow_all_outbound  = True,
             description         = id + " Database",
             security_group_name = id + " Database",
           )
    dbsg.add_ingress_rule(
      peer       =dbsg,
      connection =allAll,
      description="all from self"
    )
    dbsg.add_egress_rule(
      peer       =ec2.Peer.ipv4("0.0.0.0/0"),
      connection =allAll,
      description="all out"
    )

    oracle_connection_ports = [
      {"port":tcp1521, "description":"tcp1521 Oracle"},
      {"port":tcp1526, "description":"tcp1526 Oracle"},
      {"port":tcp1575, "description":"tcp1575 Oracle"},
    ]
    db_subnet_group = None
    for ingress_source in ingress_sources:
      for c in oracle_connection_ports:
        dbsg.add_ingress_rule(
          peer       =ingress_source,
          connection =c["port"],
          description=c["description"]
        )

      db_subnet_group = rds.SubnetGroup(self,
                         id          = "DatabaseSubnetGroup",
                         vpc         = vpc,
                         description = id + " subnet group",
                         vpc_subnets = vpc_subnets,
                         subnet_group_name=id + "subnet group"
      )

    ##
    ## Oracle Database
    ##
    oracle_secret = secretsmanager.Secret(self, "OracleCredentials",
    secret_name           =db_name + "OracleCredentials",
    description           =db_name + " Oracle Database Credentials",
    generate_secret_string=secretsmanager.SecretStringGenerator(
      exclude_characters    ="\"@/\\ '",
      generate_string_key   ="password",
      password_length       =30,
      secret_string_template='{"username":"'+ oracle_username+'"}'),
    )

    oracle_credentials = rds.Credentials.from_secret(oracle_secret, oracle_username)

    ##
    ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/ParameterGroup.html
    ##
    db_parameter_group = rds.ParameterGroup(self, "ParameterGroup",
      engine=rds.DatabaseInstanceEngine.oracle_ee(version=engine_version),
      parameters={"open_cursors": "2500"}
    )

    ##
    ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/OptionGroup.html
    ##
    db_option_group = rds.OptionGroup(self, "OptionGroup",
      engine=rds.DatabaseInstanceEngine.oracle_ee(version=engine_version),
      configurations=[
        rds.OptionConfiguration(name="LOCATOR"),
        rds.OptionConfiguration(name="OEM",port=1158,vpc=vpc)
      ]
    )

    ##
    ## https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_rds/DatabaseInstance.html
    ##
    oracle_instance = rds.DatabaseInstance(self, "OracleDatabase",
      database_name               = db_name,
      instance_identifier         = db_name,
      credentials                 = oracle_credentials,
      engine                      = rds.DatabaseInstanceEngine.oracle_ee(version=engine_version),
      backup_retention            = Duration.days(7),
      allocated_storage           = 20,
      security_groups             = [dbsg],
      license_model               = rds.LicenseModel.BRING_YOUR_OWN_LICENSE,
      allow_major_version_upgrade = True,
      auto_minor_version_upgrade  = True,
      instance_type               = instance_type,
      vpc_subnets                 = vpc_subnets,
      vpc                         = vpc,
      removal_policy              = RemovalPolicy.RETAIN,
      multi_az                    = True,
      storage_encrypted           = True,
      monitoring_interval         = Duration.seconds(60),
      enable_performance_insights = True,
      cloudwatch_logs_exports     = ["trace", "audit", "alert", "listener"],
      cloudwatch_logs_retention   = logs.RetentionDays.ONE_MONTH,
      #option_group                = db_option_group,
      parameter_group             = db_parameter_group,
      subnet_group                = db_subnet_group,
      preferred_backup_window     = backup_window,
      preferred_maintenance_window= preferred_maintenance_window,
      publicly_accessible         = False,
    ) ## rds.DatabaseInstance


    # Rotate the master user password every 30 days
    oracle_instance.add_rotation_single_user()



    Tags.of(oracle_instance).add("Name", "OracleDatabase", priority=300)



    CfnOutput(self, "OracleEndpoint",   
      export_name="OracleEndpoint",   
      value      =oracle_instance.db_instance_endpoint_address)
    CfnOutput(self, "OracleUsername",   
      export_name="OracleUsername",   
      value      =oracle_username)
    CfnOutput(self, "OracleDbName",   
      export_name="OracleDbName",   
      value      =db_name)



class LavaPlainsOfMustafar(Stack):

  def __init__(self, scope:Construct, id:str, **kwargs) -> None:
    super().__init__(scope, id, **kwargs)

    vpc = ec2.Vpc(self, "LavaPlainsVpc",
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

    Oracle(self, "LavaMiningDb",
      db_name="LavaMining",
      ingress_sources=[ec2.Peer.ipv4("10.10.10.10/32")],
      vpc_id=vpc_id,
      subnet_ids=subnet_ids,
      env={'region': 'us-east-1'},
      description="Lava Mining DB")


app = App()
# Call the stack on its own
Oracle(app, "Oracle", env={"region":"us-east-1"}, description="Oracle Instance",
  vpc_id    = "vpc-aaaaaaaa",
  subnet_ids=["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
  db_name="sampledb"
)
# Use the construct in a sample stack
LavaPlainsOfMustafar(app, "LavaPlainsOfMustafar", env={"region":"us-east-1"}, description="Mustafar")
app.synth()



