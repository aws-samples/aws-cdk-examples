package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"

	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"

	"simple-cluster/config"
	"simple-cluster/constructs/addons"
	"simple-cluster/constructs/vpc"
)

type EksCdkStackProps struct {
	awscdk.StackProps
}

func NewEksCdkStack(scope constructs.Construct, id string, props *EksCdkStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	awscdk.NewCfnOutput(stack, jsii.String("region"), &awscdk.CfnOutputProps{
		Value: stack.Region(),
	})

	// The code that defines your stack goes here
	// Create VPC
	vpc := vpc.NewEksVpc(stack)

	// Create EKS cluster
	cluster := createEksCluster(stack, vpc)
	// NOTE: You MUST install these three addons at cluster creation time.
	// If you don't, your nodes will failed to register with your cluster.
	addons.NewEksVpcCni(stack, cluster)
	addons.NewEksKubeProxy(stack, cluster)
	addons.NewEksCoreDns(stack, cluster)

	addons.NewEksEbsCsiDriver(stack, cluster)
	addons.NewEksMetricsServer(stack, cluster)
	addons.NewEksClusterAutoscaler(stack, cluster)
	addons.NewEksLoadBalancerController(stack, cluster)
	addons.NewEksNodeTerminationHandler(stack, cluster)
	if config.TargetArch(stack) == config.TargetArch_x86 {
		addons.NewEksExternalDNS(stack, cluster)
	}
	addons.NewEksAwsXray(stack, cluster)
	addons.NewEksCloudWatchMetrics(stack, cluster)
	addons.NewEksFluentBit(stack, cluster)

	// Output cluster info.
	awscdk.NewCfnOutput(stack, jsii.String("clusterName"), &awscdk.CfnOutputProps{
		Value: cluster.ClusterName(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("apiServerEndpoint"), &awscdk.CfnOutputProps{
		Value: cluster.ClusterEndpoint(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("kubectlRoleArn"), &awscdk.CfnOutputProps{
		Value: cluster.KubectlRole().RoleArn(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("oidcIdpArn"), &awscdk.CfnOutputProps{
		Value: cluster.OpenIdConnectProvider().OpenIdConnectProviderArn(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("clusterSecurityGroupId"), &awscdk.CfnOutputProps{
		Value: cluster.ClusterSecurityGroup().SecurityGroupId(),
	})
	awscdk.NewCfnOutput(stack, jsii.String("certificateAuthorityData"), &awscdk.CfnOutputProps{
		Value: cluster.ClusterCertificateAuthorityData(),
	})

	return stack
}

func createEksCluster(stack awscdk.Stack, vpc awsec2.Vpc) awseks.Cluster {
	// Create NodeGroup security group.
	nodeSG := awsec2.NewSecurityGroup(stack, jsii.String("NodeSG"), &awsec2.SecurityGroupProps{
		Vpc:              vpc,
		AllowAllOutbound: jsii.Bool(true),
		Description:      jsii.String("EKS worker nodes communicate with external."),
	})
	nodeSG.Connections().AllowFrom(nodeSG, awsec2.Port_AllTraffic(),
		jsii.String("Allow all nodes communicate each other with the this SG."))
	nodeSG.AddIngressRule(
		awsec2.Peer_AnyIpv4(),
		awsec2.NewPort(&awsec2.PortProps{
			Protocol:             awsec2.Protocol_TCP,
			FromPort:             jsii.Number(30000),
			ToPort:               jsii.Number(32767),
			StringRepresentation: jsii.String("Receive K8s NodePort requests."),
		}),
		jsii.String("Allow requests to K8s NodePort range."),
		jsii.Bool(false))
	nodeSG.AddIngressRule(
		awsec2.Peer_AnyIpv4(),
		awsec2.NewPort(&awsec2.PortProps{
			Protocol:             awsec2.Protocol_TCP,
			FromPort:             jsii.Number(8000),
			ToPort:               jsii.Number(9000),
			StringRepresentation: jsii.String("Receive HTTP requests."),
		}),
		jsii.String("Allow requests to common app range."),
		jsii.Bool(false))

	// Creating Nodegroup in private subnet only when deployment cluster in PROD stage.
	subnetType := awsec2.SubnetType_PUBLIC
	if config.DeploymentStage(stack) == config.DeploymentStage_PROD {
		subnetType = awsec2.SubnetType_PRIVATE_WITH_NAT
	}
	// Create EKS cluster.
	showCfgCmd := false
	if len(config.MasterUsers(stack)) == 0 {
		showCfgCmd = true
	}
	cluster := awseks.NewCluster(stack, jsii.String("EksCluster"), &awseks.ClusterProps{
		ClusterName: jsii.String(config.ClusterName(stack)),
		Version:     awseks.KubernetesVersion_V1_21(),
		Vpc:         vpc,
		VpcSubnets: &[]*awsec2.SubnetSelection{
			{
				SubnetType: subnetType,
			},
		},
		DefaultCapacity:     jsii.Number(0), // Disable creation of default node group.
		OutputConfigCommand: jsii.Bool(showCfgCmd),
		SecurityGroup:       nodeSG, // Set additional cluster security group.
	})

	// Create cluster node role.
	clusterNodeRole := awsiam.NewRole(stack, jsii.String("ClusterNodeRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("ec2.amazonaws.com"), &awsiam.ServicePrincipalOpts{}),
		ManagedPolicies: &[]awsiam.IManagedPolicy{
			awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("AmazonEKSWorkerNodePolicy")),
			awsiam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("AmazonEC2ContainerRegistryReadOnly")),
		},
		RoleName: jsii.String(*stack.StackName() + "-" + *stack.Region() + "-ClusterNodeRole"),
	})

	// Get key-pair pointer.
	var keyPair *string = nil
	if len(config.KeyPairName(stack)) > 0 {
		keyPair = jsii.String(config.KeyPairName(stack))
	}

	amiType := awseks.NodegroupAmiType_AL2_X86_64
	instanceClass := awsec2.InstanceClass_COMPUTE5
	if config.TargetArch(stack) == config.TargetArch_arm {
		amiType = awseks.NodegroupAmiType_AL2_ARM_64
		instanceClass = awsec2.InstanceClass_STANDARD6_GRAVITON
	}

	// Create On-Demand Instance Nodegroup Launch Template.
	onDemandNgLt := awsec2.NewLaunchTemplate(stack, jsii.String("OnDemandNodegroupLT"), &awsec2.LaunchTemplateProps{
		BlockDevices: &[]*awsec2.BlockDevice{
			{
				DeviceName: jsii.String("/dev/xvda"),
				Volume: awsec2.BlockDeviceVolume_Ebs(jsii.Number(100), &awsec2.EbsDeviceOptions{
					DeleteOnTermination: jsii.Bool(true),
					VolumeType:          awsec2.EbsDeviceVolumeType_GP3,
					Encrypted:           jsii.Bool(false),
				}),
			},
		},
		LaunchTemplateName: jsii.String(*stack.StackName() + "-OnDemandNodegroupLT"),
		SecurityGroup:      nodeSG,
		KeyName:            keyPair,
	})
	// Add On-Demand Instance Nodegroup.
	cluster.AddNodegroupCapacity(jsii.String("OnDemandNodegroup"), &awseks.NodegroupOptions{
		AmiType:      amiType,
		CapacityType: awseks.CapacityType_ON_DEMAND,
		// DesiredSize:   jsii.Number(2),
		InstanceTypes: &[]awsec2.InstanceType{awsec2.InstanceType_Of(instanceClass, awsec2.InstanceSize_LARGE)},
		Labels: &map[string]*string{
			"deployment-stage": jsii.String(string(config.DeploymentStage(stack))),
		},
		LaunchTemplateSpec: &awseks.LaunchTemplateSpec{Id: onDemandNgLt.LaunchTemplateId(), Version: onDemandNgLt.LatestVersionNumber()},
		MaxSize:            jsii.Number(3),
		MinSize:            jsii.Number(1),
		NodegroupName:      jsii.String("OnDemandNodegroup"),
		NodeRole:           clusterNodeRole,
		Subnets: &awsec2.SubnetSelection{
			SubnetType: subnetType,
		},
	})

	// Create Spot Instance Nodegroup Launch Template.
	spotNgLt := awsec2.NewCfnLaunchTemplate(stack, jsii.String("SpotNodegroupLT"), &awsec2.CfnLaunchTemplateProps{
		LaunchTemplateData: awsec2.CfnLaunchTemplate_LaunchTemplateDataProperty{
			BlockDeviceMappings: &[]*awsec2.CfnLaunchTemplate_BlockDeviceMappingProperty{
				{
					DeviceName: jsii.String("/dev/xvda"),
					Ebs: awsec2.CfnLaunchTemplate_EbsProperty{
						DeleteOnTermination: jsii.Bool(true),
						VolumeType:          jsii.String("gp3"),
						Encrypted:           jsii.Bool(false),
					},
				},
			},
			SecurityGroupIds: &[]*string{
				nodeSG.SecurityGroupId(),
			},
			KeyName: keyPair,
			TagSpecifications: &[]*awsec2.CfnLaunchTemplate_TagSpecificationProperty{
				{
					ResourceType: jsii.String("instance"),
					Tags: &[]*awscdk.CfnTag{
						{
							Key:   jsii.String("Name"),
							Value: jsii.String(config.StackName(stack) + "/SpotNodegroupLT"),
						},
					},
				},
			},
		},
		LaunchTemplateName: jsii.String(*stack.StackName() + "-SpotNodegroupLT"),
	})
	// Add Spot Instance Nodegroup.
	cluster.AddNodegroupCapacity(jsii.String("SpotNodegroup"), &awseks.NodegroupOptions{
		AmiType:      amiType,
		CapacityType: awseks.CapacityType_SPOT,
		// DesiredSize:   jsii.Number(2),
		InstanceTypes: &[]awsec2.InstanceType{awsec2.InstanceType_Of(instanceClass, awsec2.InstanceSize_LARGE)},
		Labels: &map[string]*string{
			"deployment-stage": jsii.String(string(config.DeploymentStage(stack))),
		},
		LaunchTemplateSpec: &awseks.LaunchTemplateSpec{Id: spotNgLt.Ref(), Version: spotNgLt.AttrLatestVersionNumber()},
		MaxSize:            jsii.Number(3),
		MinSize:            jsii.Number(1),
		NodegroupName:      jsii.String("SpotNodegroup"),
		NodeRole:           clusterNodeRole,
		Subnets: &awsec2.SubnetSelection{
			SubnetType: subnetType,
		},
	})

	// Mapping IAM user to K8s group.
	for _, userName := range config.MasterUsers(stack) {
		masterUser := awsiam.User_FromUserName(stack, jsii.String("ClusterMasterUser-"+userName), jsii.String(userName))
		cluster.AwsAuth().AddUserMapping(masterUser, &awseks.AwsAuthMapping{
			Groups: &[]*string{
				jsii.String("system:masters"),
			},
		})
	}

	return cluster
}

func main() {
	app := awscdk.NewApp(nil)

	NewEksCdkStack(app, config.StackName(app), &EksCdkStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	account := os.Getenv("CDK_DEPLOY_ACCOUNT")
	region := os.Getenv("CDK_DEPLOY_REGION")

	if len(account) == 0 || len(region) == 0 {
		account = os.Getenv("CDK_DEFAULT_ACCOUNT")
		region = os.Getenv("CDK_DEFAULT_REGION")
	}

	return &awscdk.Environment{
		Account: jsii.String(account),
		Region:  jsii.String(region),
	}
}
