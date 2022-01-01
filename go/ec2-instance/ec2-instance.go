package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type Ec2InstanceStackProps struct {
	awscdk.StackProps
}

func NewEc2InstanceStack(scope constructs.Construct, id string, props *Ec2InstanceStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// The code that defines your stack goes here

	subnetConfig := []*ec2.SubnetConfiguration{&ec2.SubnetConfiguration{
		SubnetType: ec2.SubnetType_PUBLIC,
		Name: jsii.String("Public-subnet"),
	}}

	// VPC
	vpc := ec2.NewVpc(stack, jsii.String("NewVpc"),
		&ec2.VpcProps{
			SubnetConfiguration: &subnetConfig,
		},
	)

	//SG
	sg := ec2.NewSecurityGroup(stack, jsii.String("NewSg"), &ec2.SecurityGroupProps{
		Vpc : vpc, 
		AllowAllOutbound: jsii.Bool(true),
	})
	sg.AddIngressRule(
		ec2.Peer_AnyIpv4(),
		ec2.Port_Tcp(jsii.Number(22)),
		jsii.String("Allow SSH"),
		jsii.Bool(false),
	)

	//AMI
	ami := ec2.NewAmazonLinuxImage(&ec2.AmazonLinuxImageProps{
		Generation: ec2.AmazonLinuxGeneration_AMAZON_LINUX_2,
		Edition: ec2.AmazonLinuxEdition_STANDARD,
		Storage: ec2.AmazonLinuxStorage_GENERAL_PURPOSE,
		Virtualization: ec2.AmazonLinuxVirt_HVM,
	})

	instanceType := ec2.NewInstanceType(jsii.String("t2.micro"))

	// INSTANCE
	newEc2 := ec2.NewInstance(stack, jsii.String("NewInstance"), &ec2.InstanceProps{
		InstanceType: instanceType,
		MachineImage: ami,
		Vpc: vpc,
		KeyName: jsii.String("MyEc2Key.pem"),
		SecurityGroup: sg, 
	})

	//OUTPUT
	awscdk.NewCfnOutput(stack, jsii.String("PublicIP"), &awscdk.CfnOutputProps{
		Value: newEc2.InstancePublicIp(),
	})


	return stack
}

func main() {
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
