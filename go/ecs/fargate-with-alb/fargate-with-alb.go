package main

import (
	cdk "github.com/aws/aws-cdk-go/awscdk/v2"

	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	ecs "github.com/aws/aws-cdk-go/awscdk/v2/awsecs"
	elb "github.com/aws/aws-cdk-go/awscdk/v2/awselasticloadbalancingv2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type FargateWithALBStackProps struct {
	cdk.StackProps
}

func NewFargateWithALBStack(scope constructs.Construct, id string, props *FargateWithALBStackProps) cdk.Stack {
	var sprops cdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := cdk.NewStack(scope, &id, &sprops)

	// Create VPC and Cluster
	vpc := ec2.NewVpc(stack, jsii.String("FargoVpc"), &ec2.VpcProps{
		MaxAzs: jsii.Number(2),
	})

	cluster := ecs.NewCluster(stack, jsii.String("FargoECSCluster"), &ecs.ClusterProps{
		Vpc: vpc,
	})

	// Create Task Definition
	taskDef := ecs.NewFargateTaskDefinition(stack, jsii.String("FargoTaskDef"), &ecs.FargateTaskDefinitionProps{
		MemoryLimitMiB: jsii.Number(512),
		Cpu:            jsii.Number(256),
	})
	container := taskDef.AddContainer(jsii.String("FargoContainer"), &ecs.ContainerDefinitionOptions{
		Image: ecs.ContainerImage_FromRegistry(jsii.String("amazon/amazon-ecs-sample"), &ecs.RepositoryImageProps{}),
	})

	container.AddPortMappings(&ecs.PortMapping{
		ContainerPort: jsii.Number(80),
		Protocol:      ecs.Protocol_TCP,
	})

	// Create Fargate Service
	service := ecs.NewFargateService(stack, jsii.String("FargoService"), &ecs.FargateServiceProps{
		Cluster:        cluster,
		TaskDefinition: taskDef,
	})

	// Create ALB
	lb := elb.NewApplicationLoadBalancer(stack, jsii.String("LB"), &elb.ApplicationLoadBalancerProps{
		Vpc:            vpc,
		InternetFacing: jsii.Bool(true),
	})

	listener := lb.AddListener(jsii.String("PublicListener"), &elb.BaseApplicationListenerProps{
		Port: jsii.Number(80),
		Open: jsii.Bool(true),
	})

	// Attach ALB to Fargate Service
	listener.AddTargets(jsii.String("Fargo"), &elb.AddApplicationTargetsProps{
		Port: jsii.Number(80),
		Targets: &[]elb.IApplicationLoadBalancerTarget{
			service.LoadBalancerTarget(&ecs.LoadBalancerTargetOptions{
				ContainerName: jsii.String("FargoContainer"),
				ContainerPort: jsii.Number(80),
			}),
		},
	})

	cdk.NewCfnOutput(stack, jsii.String("LoadBalancerDNS"), &cdk.CfnOutputProps{Value: lb.LoadBalancerDnsName()})

	return stack
}

func main() {
	app := cdk.NewApp(nil)

	NewFargateWithALBStack(app, "FargateWithALBStack", &FargateWithALBStackProps{
		cdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *cdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &cdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &cdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
