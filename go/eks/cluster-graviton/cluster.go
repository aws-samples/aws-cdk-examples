package main

import (
	"os"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
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

	eksCluster := awseks.NewCluster(stack, jsii.String("Cluster"), &awseks.ClusterProps{
		Vpc: vpc,
		DefaultCapacity: jsii.Number(0), // manage capacity with managed nodegroups later since we want to customize nodegroup
		Version: awseks.KubernetesVersion_V1_24(),
		// Enable alb controller to manage ingresses
		AlbController: &awseks.AlbControllerOptions {
			Version: awseks.AlbControllerVersion_V2_4_1(),
		},
	})

	// Managed node group with graviton based instancs
	eksCluster.AddNodegroupCapacity(jsii.String("custom-node-group"), &awseks.NodegroupOptions{
		InstanceTypes: &[]awsec2.InstanceType{
			awsec2.NewInstanceType(jsii.String("t4g.medium")),
		},
		MinSize: jsii.Number(2),
		DiskSize: jsii.Number(100),
		AmiType: awseks.NodegroupAmiType_AL2_ARM_64,
	})

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
	//  Region:  jsii.String("eu-central-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	return &awscdk.Environment{
	 Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	 Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	}
}
