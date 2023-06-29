package main

import (
	"fmt"
	"github.com/aws/aws-cdk-go/awscdk/v2"
	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	iam "github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	assets "github.com/aws/aws-cdk-go/awscdk/v2/awss3assets"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"os"
	"path/filepath"
)

type Ec2InstanceStackProps struct {
	awscdk.StackProps
}

func NewEc2InstanceStack(scope constructs.Construct, id string, props *Ec2InstanceStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	sourceDir, err := os.Getwd()
	if err != nil {
		fmt.Println("Error getting source path: ", err)
		return nil
	}

	// Construct the abs path of asset script
	scriptPath := filepath.Join(sourceDir, "configure.sh")

	stack := awscdk.NewStack(scope, &id, &sprops)

	// Define VPC
	vpc := ec2.NewVpc(stack, jsii.String("VPC"), &ec2.VpcProps{
		NatGateways: jsii.Number(0),
		SubnetConfiguration: &[]*ec2.SubnetConfiguration{
			{
				CidrMask:   jsii.Number(24),
				Name:       jsii.String("asterisk"),
				SubnetType: ec2.SubnetType_PUBLIC,
			},
		},
	})

	// Define AMI
	ami := ec2.NewAmazonLinuxImage(&ec2.AmazonLinuxImageProps{
		Generation:     ec2.AmazonLinuxGeneration_AMAZON_LINUX_2,
		Edition:        ec2.AmazonLinuxEdition_STANDARD,
		Virtualization: ec2.AmazonLinuxVirt_HVM,
		Storage:        ec2.AmazonLinuxStorage_GENERAL_PURPOSE,
	})

	// Instance Role and SSM managed policy
	role := iam.NewRole(stack, jsii.String("InstanceSSM"), &iam.RoleProps{
		AssumedBy: iam.NewServicePrincipal(jsii.String("ec2.amazonaws.com"), nil),
	})

	role.AddManagedPolicy(iam.ManagedPolicy_FromAwsManagedPolicyName(jsii.String("AmazonSSMManagedInstanceCore")))

	// Define Instance
	instance := ec2.NewInstance(stack, jsii.String("Instance"), &ec2.InstanceProps{
		InstanceType: ec2.NewInstanceType(jsii.String("t3.nano")),
		MachineImage: ami,
		Vpc:          vpc,
		Role:         role,
	})

	// Script in S3 as asset
	asset := assets.NewAsset(stack, jsii.String("Asset"), &assets.AssetProps{
		Path: jsii.String(scriptPath),
	})
	localAsset := instance.UserData().AddS3DownloadCommand(&ec2.S3DownloadOptions{
		Bucket:    asset.Bucket(),
		BucketKey: asset.S3ObjectKey(),
	})

	// Userdata executes script from S3
	instance.UserData().AddExecuteFileCommand(&ec2.ExecuteFileOptions{
		FilePath: localAsset,
	})
	asset.GrantRead(instance.Role())

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewEc2InstanceStack(app, "Ec2InstanceStack", &Ec2InstanceStackProps{
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
