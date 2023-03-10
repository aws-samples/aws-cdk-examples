package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	ecs "github.com/aws/aws-cdk-go/awscdk/v2/awsecs"
	elb "github.com/aws/aws-cdk-go/awscdk/v2/awselasticloadbalancingv2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type ClusterAlbStackProps struct {
	awscdk.StackProps
}

func NewClusterAlbStack(scope constructs.Construct, id string, props *ClusterAlbStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here
	cidrRange := "10.25.0.0/16"
	containerPort := *jsii.Number(80)

	vpc := ec2.NewVpc(stack, jsii.String("EcsClusterVpc"), &ec2.VpcProps{
		MaxAzs:             jsii.Number(3),
		VpcName:            jsii.String("EcsClusterVpc"),
		IpAddresses:        ec2.IpAddresses_Cidr(jsii.String(cidrRange)),
		NatGatewayProvider: ec2.NatProvider_Gateway(&ec2.NatGatewayProps{}),
	})

	ecsCluster := ecs.NewCluster(stack, jsii.String("EcsCluster"), &ecs.ClusterProps{
		Vpc:         vpc,
		ClusterName: jsii.String("MyEcsCluster"),
		Capacity: &ecs.AddCapacityOptions{
			AutoScalingGroupName: jsii.String("EcsClusterAsg"),
			InstanceType:         ec2.InstanceType_Of(ec2.InstanceClass_T2, ec2.InstanceSize_MICRO),
			MaxCapacity:          jsii.Number(3),
			MinCapacity:          jsii.Number(1),
		},
	})

	taskDefinition := ecs.NewTaskDefinition(stack, jsii.String("EcsTaskDef"), &ecs.TaskDefinitionProps{
		Compatibility: ecs.Compatibility_EC2,
	})

	container := taskDefinition.AddContainer(jsii.String("EcsSampleContainer"), &ecs.ContainerDefinitionOptions{
		ContainerName:  jsii.String("EcsSampleContainer"),
		Image:          ecs.ContainerImage_FromRegistry(jsii.String("amazon/amazon-ecs-sample"), &ecs.RepositoryImageProps{}),
		MemoryLimitMiB: jsii.Number(256),
	})

	container.AddPortMappings(&ecs.PortMapping{
		ContainerPort: jsii.Number(containerPort),
		Protocol:      ecs.Protocol_TCP,
	})

	ecsService := ecs.NewEc2Service(stack, jsii.String("EcsService"), &ecs.Ec2ServiceProps{
		Cluster:        ecsCluster,
		TaskDefinition: taskDefinition,
		DesiredCount:   jsii.Number(2),
		ServiceName:    jsii.String("ecs-sample-service"),
	})

	alb := elb.NewApplicationLoadBalancer(stack, jsii.String("EcsLoadBalancer"), &elb.ApplicationLoadBalancerProps{
		Vpc:              vpc,
		LoadBalancerName: jsii.String("EcsClusterALB"),
		InternetFacing:   jsii.Bool(true),
		VpcSubnets: &ec2.SubnetSelection{
			SubnetType: ec2.SubnetType_PUBLIC,
		},
	})

	albListener := alb.AddListener(jsii.String("AlbPublicListener"), &elb.BaseApplicationListenerProps{
		Port: jsii.Number(containerPort),
		Open: jsii.Bool(true),
	})

	albListener.AddTargets(jsii.String("AlbTargets"), &elb.AddApplicationTargetsProps{
		Protocol: elb.ApplicationProtocol_HTTP,
		Targets: &[]elb.IApplicationLoadBalancerTarget{
			ecsService.LoadBalancerTarget(&ecs.LoadBalancerTargetOptions{
				ContainerName: jsii.String("EcsSampleContainer"),
				ContainerPort: jsii.Number(containerPort),
				Protocol: ecs.Protocol_TCP,
			}),
		},
		HealthCheck: &elb.HealthCheck{
			Enabled:  jsii.Bool(true),
			Interval: awscdk.Duration_Seconds(jsii.Number(60)),
			Path:     jsii.String("/"),
			Timeout:  awscdk.Duration_Seconds(jsii.Number(5)),
		},
	})

	awscdk.NewCfnOutput(stack, jsii.String("AlbEndpoint"), &awscdk.CfnOutputProps{
		Value: alb.LoadBalancerDnsName(),
	})
	
	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewClusterAlbStack(app, "ClusterAlbStack", &ClusterAlbStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
