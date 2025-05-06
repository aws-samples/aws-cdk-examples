package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awseks"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	kubectl "github.com/cdklabs/awscdk-kubectl-go/kubectlv31/v2"
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

	// VPC
	vpc := awsec2.NewVpc(stack, jsii.String("EKSVpc"), nil) // Create a new VPC for our cluster

	// Cluster
	eksCluster := awseks.NewCluster(stack, jsii.String("Cluster"), &awseks.ClusterProps{
		Vpc:             vpc,
		DefaultCapacity: jsii.Number(0), // manage capacity with managed nodegroups later since we want to customize nodegroup
		KubectlLayer:    kubectl.NewKubectlV31Layer(stack, jsii.String("kubectl131layer")),
		Version:         awseks.KubernetesVersion_V1_31(),
		AlbController: &awseks.AlbControllerOptions{
			Version: awseks.AlbControllerVersion_V2_8_2(),
		},
	})

	// Managed Node Group
	eksCluster.AddNodegroupCapacity(
		jsii.String("custom-node-group"), &awseks.NodegroupOptions{
			InstanceTypes: &[]awsec2.InstanceType{
				awsec2.NewInstanceType(jsii.String("t4g.medium")),
			},
			DesiredSize: jsii.Number(2),
			MinSize:     jsii.Number(2),
			MaxSize:     jsii.Number(5),
			DiskSize:    jsii.Number(100),
			AmiType:     awseks.NodegroupAmiType_AL2023_ARM_64_STANDARD,
		})

	// Fargate Profile
	awseks.NewFargateProfile(stack, jsii.String("MyProfile"), &awseks.FargateProfileProps{
		Cluster: eksCluster,
		Selectors: &[]*awseks.Selector{
			{
				Namespace: jsii.String("default"),
			},
		},
	})

	// Create common addon configuration function to reduce code duplication
	addManagedAddon := func(name string, id string) {
		awseks.NewCfnAddon(stack, jsii.String(id), &awseks.CfnAddonProps{
			AddonName:   jsii.String(name),
			ClusterName: eksCluster.ClusterName(),
		})
	}

	// Create required addons using the helper function
	addManagedAddon("kube-proxy", "CfnAddonKubeProxy")
	addManagedAddon("vpc-cni", "CfnAddonVpcCni")
	addManagedAddon("coredns", "CfnAddonCoreDns")
	addManagedAddon("eks-pod-identity-agent", "CfnAddonEksPodIdentityAgent")
	addManagedAddon("metrics-server", "CfnAddonMetricsServer")

	return stack
}

func main() {
	defer jsii.Close()

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
