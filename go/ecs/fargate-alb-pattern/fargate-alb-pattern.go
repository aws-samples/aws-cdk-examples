package main

import (
	cdk "github.com/aws/aws-cdk-go/awscdk"

	ec2 "github.com/aws/aws-cdk-go/awscdk/awsec2"
	ecs "github.com/aws/aws-cdk-go/awscdk/awsecs"
	ecs_patterns "github.com/aws/aws-cdk-go/awscdk/awsecspatterns"
	"github.com/aws/constructs-go/constructs/v3"
	"github.com/aws/jsii-runtime-go"
	"os"
)

type ALBFargatePatternStackProps struct {
	cdk.StackProps
}

func NewALBFargatePatternStack(scope constructs.Construct, id string, props *ALBFargatePatternStackProps) cdk.Stack {
	var sprops cdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := cdk.NewStack(scope, &id, &sprops)

	// Create VPC and Cluster
	vpc := ec2.NewVpc(stack, jsii.String("ALBFargoVpc"), &ec2.VpcProps{
		MaxAzs: jsii.Number(2),
	})

	cluster := ecs.NewCluster(stack, jsii.String("ALBFargoECSCluster"), &ecs.ClusterProps{
		Vpc: vpc,
	})

	res := ecs_patterns.NewApplicationLoadBalancedFargateService(stack, jsii.String("ALBFargoService"), &ecs_patterns.ApplicationLoadBalancedFargateServiceProps{
		Cluster: cluster,
		TaskImageOptions: &ecs_patterns.ApplicationLoadBalancedTaskImageOptions{
			Image: ecs.ContainerImage_FromRegistry(jsii.String("amazon/amazon-ecs-sample"), &ecs.RepositoryImageProps{}),
		},
	})

	cdk.NewCfnOutput(stack, jsii.String("LoadBalancerDNS"), &cdk.CfnOutputProps{Value: res.LoadBalancer().LoadBalancerDnsName()})

	return stack
}

func main() {
	app := cdk.NewApp(nil)

	NewALBFargatePatternStack(app, "ALBFargatePatternStack", &ALBFargatePatternStackProps{
		cdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *cdk.Environment {
	return &cdk.Environment{
		Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
		Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	}
}
