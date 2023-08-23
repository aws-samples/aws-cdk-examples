package software.amazon.awscdk.examples;

import software.constructs.Construct;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.SecretValue;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.AmazonLinux2023ImageSsmParameterProps;
import software.amazon.awscdk.services.ec2.AmazonLinuxCpuType;
import software.amazon.awscdk.services.ec2.AmazonLinuxEdition;
import software.amazon.awscdk.services.ec2.EbsDeviceVolumeType;
import software.amazon.awscdk.services.ec2.IMachineImage;
import software.amazon.awscdk.services.ec2.Instance;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.MachineImage;
import software.amazon.awscdk.services.ec2.Peer;
import software.amazon.awscdk.services.ec2.Port;
import software.amazon.awscdk.services.ec2.S3DownloadOptions;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.iam.Effect;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.Policy;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.opensearchservice.AdvancedSecurityOptions;
import software.amazon.awscdk.services.opensearchservice.CapacityConfig;
import software.amazon.awscdk.services.opensearchservice.Domain;
import software.amazon.awscdk.services.opensearchservice.EbsOptions;
import software.amazon.awscdk.services.opensearchservice.EncryptionAtRestOptions;
import software.amazon.awscdk.services.opensearchservice.EngineVersion;
import software.amazon.awscdk.services.opensearchservice.ZoneAwarenessConfig;
import software.amazon.awscdk.services.s3.assets.Asset;
import software.amazon.awscdk.services.sns.Topic;
import software.amazon.awscdk.services.sns.subscriptions.EmailSubscription;

/**
 * This class defines the following resources:
 * - VPC
 * - Security Group for OpenSearch
 * - EC2
 * - Relevant IAM roles and policies
 * - SNS
 * - Configuration for nginx proxy
 */
public class OpenSearchStack extends Stack {

        public OpenSearchStack(final Construct scope, final String id, final StackProps props) {
                super(scope, id, props);
                /************************ VPC ************************/
                // Define VPC with a maximum of 3 AZs
                Vpc vpc = Vpc.Builder.create(this, "OpenSearchVpC")
                                .maxAzs(3)
                                .build();

                // Security Group for OpenSearch Domain - define inbound and outbound rules
                SecurityGroup openSearchSecurityGroup = SecurityGroup.Builder.create(this, "OpenSearchSG")
                                .vpc(vpc)
                                .allowAllOutbound(true)
                                .securityGroupName("OpenSearchSG")
                                .build();

                // Define Inbound Rules to the Security Group
                openSearchSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
                openSearchSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));

                // Define VPC subnets for OpenSearch domain
                SubnetSelection suVpcSubnets = SubnetSelection.builder().subnetType(SubnetType.PUBLIC)
                                .build();

                /************************ OpenSearch Domain ************************/
                // Define OpenSearch domain
                Domain devDomain = Domain.Builder.create(this, "OpenSearchDomain")
                                .version(EngineVersion.OPENSEARCH_2_5)
                                .domainName("test-opensearch-domain")
                                .capacity(CapacityConfig.builder()
                                                .masterNodeInstanceType(
                                                                ConstantsVariables.DOMAIN_MASTER_NODE_INSTANCE_TYPE)
                                                .masterNodes(ConstantsVariables.DOMAIN_MASTER_NODE_INSTANCE_COUNT)
                                                .dataNodeInstanceType(
                                                                ConstantsVariables.DOMAIN_NAME_DATA_NODE_INSTANCE_TYPE)
                                                .dataNodes(ConstantsVariables.DOMAIN_NAME_DATA_NODE_INSTANCE_COUNT)
                                                .warmInstanceType(
                                                                ConstantsVariables.DOMAIN_NAME_ULRAWARM_NODE_INSTANCE_TYPE)
                                                .warmNodes(ConstantsVariables.DOMAIN_NAME_ULRAWARM_NODE_INSTANCE_COUNT)
                                                .build())
                                // Define Elastic block store - ebs volumnes that are attached to data nodes in
                                // the OpenSearch domain
                                .ebs(EbsOptions.builder()
                                                .enabled(true)
                                                .volumeSize(ConstantsVariables.DOMAIN_INSTANCE_VOLUME_SIZE)
                                                .volumeType(EbsDeviceVolumeType.GP3)
                                                .iops(null) // numer of I/O operations per second that the volume
                                                // supports. This property
                                                // only applies to gp3 and provisioned IOPS EBS volume types
                                                .build())
                                .vpc(vpc)
                                // Define specific subnet
                                .vpcSubnets(List.of(suVpcSubnets))
                                .securityGroups(Arrays.asList(openSearchSecurityGroup))
                                // If you enabled multiple Availability Zones (AZs), the number of AZs that you
                                // want the domain to use.
                                .zoneAwareness(ZoneAwarenessConfig.builder()
                                                .enabled(true)
                                                .availabilityZoneCount(ConstantsVariables.DOMAIN_AZ_COUNT)
                                                .build())
                                .enforceHttps(true)
                                .nodeToNodeEncryption(true)
                                .encryptionAtRest(EncryptionAtRestOptions.builder()
                                                .enabled(true)
                                                .build())
                                //
                                .useUnsignedBasicAuth(true)
                                .fineGrainedAccessControl(AdvancedSecurityOptions.builder()
                                                .masterUserName(ConstantsVariables.DOMAIN_NAME_ADMIN_USERNAME)
                                                .masterUserPassword(SecretValue.unsafePlainText(
                                                                ConstantsVariables.DOMAIN_NAME_ADMIN_PASSWORD))
                                                .build())
                                .build();

                CfnOutput.Builder.create(this, "MasterUser")
                                .value(ConstantsVariables.DOMAIN_NAME_ADMIN_USERNAME)
                                .description("Master user name for Amazon OpenSarch Service")
                                .build();

                CfnOutput.Builder.create(this, "MasterPassword")
                                .value(ConstantsVariables.DOMAIN_NAME_ADMIN_PASSWORD)
                                .description("Master user password for Amazon OpenSearch Service")
                                .build();

                /************************
                 * Jump Host to setup nginx Proxy
                 ************************/
                // Define subnet selection for EC2 instance
                SubnetSelection subnetPublic = SubnetSelection.builder()
                                .subnetType(SubnetType.PUBLIC)
                                .build();

                // Define Linux
                IMachineImage amazonIMachineImage = MachineImage
                                .latestAmazonLinux2023(AmazonLinux2023ImageSsmParameterProps.builder()
                                                .edition(AmazonLinuxEdition.STANDARD)
                                                .cpuType(AmazonLinuxCpuType.X86_64)
                                                .build());
                // Instance role and SSM managed policy
                Role instanceRole = Role.Builder.create(this, "OPenSearchInstanceSSM")
                                .assumedBy(ServicePrincipal.Builder.create("ec2.amazonaws.com").build())
                                .managedPolicies(Arrays.asList(
                                                ManagedPolicy.fromAwsManagedPolicyName(
                                                                "service-role/AmazonEC2RoleforSSM"),
                                                ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")))
                                .build();
                // Define EC2 instance
                Instance ec2Instance = Instance.Builder.create(this, "opensearch-proxy-instance")
                                .instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO))
                                .machineImage(amazonIMachineImage)
                                .vpc(vpc)
                                .vpcSubnets(subnetPublic)
                                .role(instanceRole)
                                .build();

                ec2Instance.getConnections().allowFromAnyIpv4(Port.tcp(22), "SSH");
                ec2Instance.getConnections().allowFromAnyIpv4(Port.tcp(443), "HTTPS");

                // Define a policy statement that is related to Amazon Elasticsearch (ES)
                // services
                PolicyStatement policyStatement = PolicyStatement.Builder.create()
                                .actions(Collections.singletonList("es:*"))
                                .resources(Collections.singletonList(devDomain.getDomainArn())).build();
                // Attach the inline policy to the IAM role associated with ec2_instance
                // Returns an immutable list containing only the specified object.
                ec2Instance.getRole().attachInlinePolicy(Policy.Builder.create(this, "EC2_InstancePolicy")
                                .statements(Collections.singletonList(policyStatement))
                                .build());

                // Create SNS topic, subscription
                Topic snsTopic = Topic.Builder.create(this, "opensearch101_sns_topic").build();
                // Add Subscription - Subscribe some endpoint to this topic.
                // Various subscriptions can be added to the topic
                snsTopic.addSubscription(
                                EmailSubscription.Builder.create(ConstantsVariables.SNS_NOTIFICATION_EMAIL).build());
                // Define IAM PolicyStatement
                PolicyStatement snsPolicyStatement = PolicyStatement.Builder.create()
                                .actions(Collections.singletonList("sns:publish"))
                                .resources(Collections.singletonList(snsTopic.getTopicArn()))
                                .effect(Effect.ALLOW)
                                .build();

                ManagedPolicy snsPolicy = ManagedPolicy.Builder.create(this, "opensearch_demo_policy")
                                .statements(Collections.singletonList(snsPolicyStatement))
                                .build();

                Role snsRole = Role.Builder.create(this, id)
                                .assumedBy(ServicePrincipal.Builder.create("es.amazonaws.com").build())
                                .managedPolicies(Collections.singletonList(snsPolicy))
                                .build();
                snsRole.addManagedPolicy(snsPolicy);
                // Define Assets
                Asset dashboardsAsset = Asset.Builder.create(this, "DashboardsAsset")
                                .path("confs/export_opensearch_dashboards_web_logs.ndjson")
                                .build();
                dashboardsAsset.grantRead(ec2Instance.getRole());
                // getUserData() - The user data script to make available to the instance.

                String dashboardsAssetPath = ec2Instance.getUserData()
                                .addS3DownloadCommand(S3DownloadOptions.builder()
                                                .bucket(dashboardsAsset.getBucket())
                                                .bucketKey(dashboardsAsset.getS3ObjectKey())
                                                .build());
                // Configure for nginx proxy
                Asset nginxAsset = Asset.Builder.create(this, "NginxAsset")
                                .path("confs/nginx_opensearch.conf")
                                .build();

                nginxAsset.grantRead(ec2Instance.getRole());

                String nginxAssetPath = ec2Instance.getUserData().addS3DownloadCommand(S3DownloadOptions.builder()
                                .bucket(nginxAsset.getBucket())
                                .bucketKey(nginxAsset.getS3ObjectKey())
                                .build());
                System.out.println(nginxAssetPath);
                // Adhoc script to show samples for creating ISM, Alerts, Users etc
                Asset postDeploymentAsset = Asset.Builder.create(this, "PostDeploymentAsset")
                                .path("confs/post_deployment_objects.sh")
                                .build();
                postDeploymentAsset.grantRead(ec2Instance.getRole());

                String postDeploymentAssetPath = ec2Instance.getUserData()
                                .addS3DownloadCommand(S3DownloadOptions.builder()
                                                .bucket(postDeploymentAsset.getBucket())
                                                .bucketKey(postDeploymentAsset.getS3ObjectKey())
                                                .build());
                // ec2Instance user data commands
                String[] commands = {
                                "yum update -y",
                                "yum install jq -y",
                                // "amazon-linux-extras install nginx1.12",
                                "dnf install nginx -y",
                                "mkdir -p /home/ec2-user/assets",
                                "cd /home/ec2-user/assets",
                                "mv " + dashboardsAssetPath + " export_opensearch_dashboards_web_logs.ndjson",
                                "echo dashboardsAssetPath",
                                "mv " + nginxAssetPath + " nginx_opensearch.conf",
                                "mv " + postDeploymentAssetPath + " post_deployment_objects.sh",
                                "wget https://raw.githubusercontent.com/aiven/demo-opensearch-python/main/full_format_recipes.json",
                                "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/cert.key -out /etc/nginx/cert.crt -subj /C=US/ST=./L=./O=./CN=.\n"
                                                +
                                                "cp nginx_opensearch.conf /etc/nginx/conf.d/",
                                "sed -i 's/DOMAIN_ENDPOINT/" + devDomain.getDomainEndpoint()
                                                + "/g' /etc/nginx/conf.d/nginx_opensearch.conf",
                                "sed -i 's/DOMAIN_ENDPOINT/"
                                                + devDomain.getDomainEndpoint()
                                                + "/g' /home/ec2-user/assets/post_deployment_objects.sh",
                                "sed -i 's=SNS_ROLE_ARN="
                                                + snsRole.getRoleArn()
                                                + "=g' /home/ec2-user/assets/post_deployment_objects.sh",
                                "sed -i 's/SNS_TOPIC_ARN/"
                                                + snsTopic.getTopicArn()
                                                + "/g' /home/ec2-user/assets/post_deployment_objects.sh",
                                "sed -i 's=DOMAIN_NAME_ADMIN_USERNAME="
                                                + ConstantsVariables.DOMAIN_NAME_ADMIN_USERNAME
                                                + "=g' /home/ec2-user/assets/post_deployment_objects.sh",
                                "sed -i 's=DOMAIN_NAME_ADMIN_PASSWORD="
                                                + ConstantsVariables.DOMAIN_NAME_ADMIN_PASSWORD
                                                + "=g' /home/ec2-user/assets/post_deployment_objects.sh",
                                "systemctl start nginx.service",
                                "systemctl enable nginx.service",
                                "chmod 500 post_deployment_objects.sh",
                                "sleep 5",
                                "bash --verbose post_deployment_objects.sh",
                };
                // Add commands to Ec2 instance user data
                ec2Instance.getUserData().addCommands(commands);

                // Define CfnOutputs
                CfnOutput.Builder.create(this, "Dashboards URL (via Jump host)")
                                .value("https://" + ec2Instance.getInstancePublicIp())
                                .description("Dashboards URL via Jump Host")
                                .build();
                CfnOutput.Builder.create(this, "SNS Subscription alert message")
                                .value(ConstantsVariables.SNS_NOTIFICATION_EMAIL)
                                .description("Please confirm your SNS subscription received at")
                                .build();
        }
}

/***
 * Useful resources
 * //
 * https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/opensearchservice/package-summary.html
 * // Define opensearch domain:
 * https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/opensearchservice/package-summary.html
 * //
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-ebsoptions.html
 * //
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-zoneawarenessconfig.html#cfn-opensearchservice-domain-zoneawarenessconfig-availabilityzonecount
 * //
 * https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/ec2/package-summary.html
 * // https://docs.oracle.com/javase/8/docs/api/java/util/Collections.html
 * //
 * https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/ec2/S3DownloadOptions.html
 */
