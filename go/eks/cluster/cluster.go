package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsautoscaling"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type ClusterStackProps struct {
	awscdk.StackProps
}

func NewClusterStack(scope constructs.Construct, id string, props *ClusterStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	vpc := awsec2.NewVpc(stack, jsii.String("EKSVpc"), nil) // Create a new VPC for our cluster

	// IAM role for our EC2 worker nodes
	workerRole := awsiam.NewRole(stack, jsii.String("EKSWorkerRole"), &awsiam.RoleProps{
		AssumedBy: awsiam.NewServicePrincipal(jsii.String("ec2.amazonaws.com"), nil),
	});

	eksCluster := awseks.NewCluster(stack, jsii.String("Cluster"), &awseks.ClusterProps{
		Vpc: vpc,
		DefaultCapacity: jsii.Number(0), // we want to manage capacity our selves
		Version: awseks.KubernetesVersion_V1_16(),
	})

	onDemandASG := awsautoscaling.NewAutoScalingGroup(stack, jsii.String("OnDemandASG"), &awsautoscaling.AutoScalingGroupProps{
		Vpc: vpc,
		Role: workerRole,
		MinCapacity: jsii.Number(1),
		MaxCapacity: jsii.Number(10),
		InstanceType: awsec2.NewInstanceType(jsii.String("t3.medium")),
		MachineImage: awseks.NewEksOptimizedImage(&awseks.EksOptimizedImageProps{
			KubernetesVersion: jsii.String("1.14"),
			NodeType: awseks.NodeType_STANDARD,
		}),
	});

	eksCluster.ConnectAutoScalingGroupCapacity(onDemandASG, &awseks.AutoScalingGroupOptions{});

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewClusterStack(app, "ClusterStack", &ClusterStackProps{
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
