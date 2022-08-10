from constructs import Construct
from aws_cdk import (
    Duration,
    NestedStack,
    Stack,
)
from aws_cdk import (
    aws_iot as iot,
    aws_msk_alpha as msk,
    aws_lambda as _lambda,
    aws_ec2 as ec2,
    aws_secretsmanager as sm,
    aws_kms as kms,
    aws_iam as iam
)

from aws_cdk.aws_lambda_event_sources import ManagedKafkaEventSource


constants = {
    "KAFKA_DOWNLOAD_VERSION": "kafka_2.12-2.6.2",
    "KAFKA_VERSION": "2.6.2",
    "KAFKA_CLIENT_INSTANCE": "t2.xlarge",
    "MSK_TOPIC": "topic",
    "IOT_TOPIC": 'iot/topic'
}


class LambdaConsumer(Stack):
    def __init__(self, 
                scope: Construct, 
                construct_id: str,
                cluster_arn,
                vpc, 
                msk_key: kms.IKey,
                iot_task_policies, 
                **kwargs):

        super().__init__(scope, construct_id, **kwargs)
        if not self.node.try_get_context("SecretFullArn"):
            return

        # Lambda function 
        function = _lambda.Function(self, "LambdaFunction",
                                    function_name="mskdemo_consume_message",
                                    runtime=_lambda.Runtime.PYTHON_3_9,
                                    vpc=vpc,
                                    handler="lambda-handler.lambda_handler",
                                    code=_lambda.Code.from_asset("./msk_demo/lambda"))

        # Lambda function role 
        function.role.attach_inline_policy(
            iam.Policy(self, "LambdaRolePolicy",
            statements=iot_task_policies)
        )
        
        # MSK secret from full ARN (includes the 6-digit suffix) 
        msk_secret = sm.Secret.from_secret_attributes(self, "MskSecret", 
            secret_complete_arn=self.node.try_get_context("SecretFullArn"))
    
        
        msk_key.grant_decrypt(function.role)
        
        # Lambda function MSK trigger
        function_trigger = ManagedKafkaEventSource(
            cluster_arn=cluster_arn,
            topic=constants["MSK_TOPIC"],
            secret=msk_secret,
            batch_size=10,
            starting_position=_lambda.StartingPosition.LATEST,
            max_batching_window=Duration.seconds(10)
        )

        # Add trigger to Lambda function
        function.add_event_source(function_trigger)


class IotProducerDestination(NestedStack):
    def __init__(self, 
                scope: Construct, 
                construct_id: str, 
                vpc_id,
                role_arn,
                subnet_ids,
                **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Create Iot Messaging Destination for MSK Cluster
        destination = iot.CfnTopicRuleDestination(self, "TopicDestination", 
            vpc_properties=iot.CfnTopicRuleDestination.VpcDestinationPropertiesProperty(
                role_arn=role_arn,
                vpc_id=vpc_id,
                subnet_ids=subnet_ids
            )
        )
        self.arn = destination.attr_arn
     

class IotProducer(NestedStack):
    def __init__(self, 
                scope: Construct, 
                construct_id: str, 
                vpc_id,
                role_arn,
                subnet_ids,
                bootstrap_brokers_sasl_scram,
                **kwargs):
        super().__init__(scope, construct_id, **kwargs)


        destination = IotProducerDestination(self, "IotProducerTopicDestination", 
            role_arn=role_arn,
            vpc_id=vpc_id,
            subnet_ids=subnet_ids
        )
        
        # Create Iot Messaging Rule for MSK Cluster
        rule = iot.CfnTopicRule(self, "TopicRule",
            topic_rule_payload=iot.CfnTopicRule.TopicRulePayloadProperty(
                actions=[iot.CfnTopicRule.ActionProperty(
                    kafka=iot.CfnTopicRule.KafkaActionProperty(
                        destination_arn=destination.arn,
                        topic=constants["MSK_TOPIC"],
                        client_properties= {
                            'bootstrap.servers': bootstrap_brokers_sasl_scram,
                            'sasl.mechanism': 'SCRAM-SHA-512',
                            'security.protocol': 'SASL_SSL',
                            'sasl.scram.username': "${get_secret('AmazonMSK_iotCluster_demo', 'SecretString', 'username', '" + role_arn + "')}",
                            'sasl.scram.password': "${get_secret('AmazonMSK_iotCluster_demo', 'SecretString', 'password', '" + role_arn + "')}"
                        }
                    )
                )],
                sql='SELECT * FROM "' + constants["IOT_TOPIC"] + '"'
            )
        )


class MSKClient(NestedStack):
    def __init__(self, 
                scope: Construct, 
                construct_id: str, 
                vpc, 
                client_subnet, 
                zookeeper,
                **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # AMI
        amzn_linux = ec2.MachineImage.latest_amazon_linux(
            generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            edition=ec2.AmazonLinuxEdition.STANDARD,
            virtualization=ec2.AmazonLinuxVirt.HVM,
            storage=ec2.AmazonLinuxStorage.GENERAL_PURPOSE
        )
        
        role = iam.Role(self, "InstanceSSM", assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"))

        role.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"))

        # Instance
        instance = ec2.Instance(self, "Instance",
            instance_type=ec2.InstanceType(constants["KAFKA_CLIENT_INSTANCE"]),
            machine_image=amzn_linux,
            vpc = vpc,
            vpc_subnets=client_subnet,
            role = role,
            
        )

        client_security_group = ec2.SecurityGroup(self, 'InstanceSecurityGroup', vpc=vpc)
        
        client_security_group.add_ingress_rule(
            ec2.Peer.ipv4('0.0.0.0/0'),
            ec2.Port.tcp(22),
        )
        instance.add_security_group(client_security_group)

        # Commands to install dependencies
        instance.user_data.add_commands(
            "yum install java-1.8.0 -y",
            f'wget https://archive.apache.org/dist/kafka/{constants["KAFKA_VERSION"]}/{constants["KAFKA_DOWNLOAD_VERSION"]}.tgz',
            f"tar -xzf {constants['KAFKA_DOWNLOAD_VERSION']}.tgz",
            f"./{constants['KAFKA_DOWNLOAD_VERSION']}/bin/kafka-topics.sh --create --zookeeper {zookeeper} --replication-factor 2 --partitions 1 --topic {constants['MSK_TOPIC']}",
        )


class MskBroker(NestedStack):
    def __init__(self, scope: Construct, construct_id: str, vpc, client_subnet, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Create the MSK cluster with SASL/SCRAM authentication
        self.cluster = msk.Cluster(self, "Cluster",
            cluster_name="iotCluster",
            kafka_version=msk.KafkaVersion.V2_8_1,
            vpc=vpc,
            encryption_in_transit=msk.EncryptionInTransitConfig(
                client_broker=msk.ClientBrokerEncryption.TLS
            ),
            client_authentication=msk.ClientAuthentication.sasl(
                scram=True
            ),    
        )

        # Enable MSK cluster connection  
        self.cluster.connections.allow_from(
            ec2.Peer.ipv4("0.0.0.0/0"),
            ec2.Port.tcp(2181))
        self.cluster.connections.allow_from(
            ec2.Peer.ipv4("0.0.0.0/0"),
            ec2.Port.tcp(9096))
        
        # EC2 Instance in the public subnet used to create the topics
        client = MSKClient(self, "MskClient", 
            vpc=vpc, 
            client_subnet=client_subnet, 
            zookeeper=self.cluster.zookeeper_connection_string)


class MskDemoStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1 Public Subnet and 2 Private
        subnets = []
        subnets.append(ec2.SubnetConfiguration(
            name = "MSKDemo-subnet-public1", 
            subnet_type = ec2.SubnetType.PUBLIC, 
            cidr_mask = 20))
        subnets.append(ec2.SubnetConfiguration(
            name = "MSKDemo-subnet-private1", 
            subnet_type = ec2.SubnetType.PRIVATE_WITH_NAT, 
            cidr_mask = 20))
        subnets.append(ec2.SubnetConfiguration(
            name = "MSKDemo-subnet-private2", 
            subnet_type = ec2.SubnetType.PRIVATE_ISOLATED, 
            cidr_mask = 20))
        
        vpc = ec2.Vpc(self, "MskVpc",
            cidr="10.0.0.0/16",
            nat_gateways=1,
            max_azs=2,
            subnet_configuration = subnets)

        # Instantiates the MSK cluster and an EC2 Instance used to create the topics
        msk_cluster = MskBroker(self, 'MSKBroker', 
            vpc=vpc, 
            client_subnet=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC)
        ).cluster
        
        # Create MSK cluster secret and encryption key
        msk_cluster.add_user('demo')

        # Policies that will be applied to Iot Core components and the Lambda function
        iot_task_policy = iam.PolicyStatement(
            actions=[
                "kafka:DescribeCluster",
                "kafka:GetBootstrapBrokers",
                "kafka:ListScramSecrets",
                "ec2:CreateNetworkInterface",
                "ec2:CreateNetworkInterfacePermission",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeVpcs",
                "ec2:DeleteNetworkInterface",
                "ec2:DescribeSubnets",
                "ec2:DescribeVpcAttribute",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeSecurityGroupRules",
                "ec2:DescribeSecurityGroupReferences",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "secretsmanager:GetRandomPassword",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:GenerateDataKeyWithoutPlaintext",
                "kms:GenerateDataKeyPairWithoutPlaintext",
                "kms:GenerateDataKeyPair"],
            resources=["*"]
        )

        sm_policy = iam.PolicyStatement(
            actions=[
                "secretsmanager:DescribeSecret",
                "secretsmanager:PutSecretValue",
                "secretsmanager:CreateSecret",
                "secretsmanager:DeleteSecret",
                "secretsmanager:CancelRotateSecret",
                "secretsmanager:ListSecretVersionIds",
                "secretsmanager:UpdateSecret",
                "secretsmanager:GetResourcePolicy",
                "secretsmanager:GetSecretValue",
                "secretsmanager:StopReplicationToReplica",
                "secretsmanager:ReplicateSecretToRegions",
                "secretsmanager:RestoreSecret",
                "secretsmanager:RotateSecret",
                "secretsmanager:UpdateSecretVersionStage",
                "secretsmanager:RemoveRegionsFromReplication"],
            resources=[f"arn:aws:secretsmanager:{self.region}:{self.account}:secret:AmazonMSK_iotCluster_demo*"]
        )

        
        iot_task_role = iam.Role(self, "IotTaskRole",
            assumed_by=iam.ServicePrincipal('iot.amazonaws.com'))

        iot_task_role.add_to_policy(iot_task_policy)
        iot_task_role.add_to_policy(sm_policy)
        
        # Create the Iot Messaging destination and rule
        iot_producer = IotProducer(self, 'IotProducer', 
            vpc_id=vpc.vpc_id,
            role_arn=iot_task_role.role_arn,
            subnet_ids=vpc.select_subnets(subnet_type=ec2.SubnetType.PRIVATE_WITH_NAT).subnet_ids,
            bootstrap_brokers_sasl_scram=msk_cluster.bootstrap_brokers_sasl_scram)
        
        # Create the Lambda function with an MSK trigger
        lambda_consumer = LambdaConsumer(self, 'LambdaConsumer', 
            cluster_arn=msk_cluster.cluster_arn, 
            vpc=vpc,
            msk_key=msk_cluster.sasl_scram_authentication_key,
            iot_task_policies=[iot_task_policy, sm_policy])
