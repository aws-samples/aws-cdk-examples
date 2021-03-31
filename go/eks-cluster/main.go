package main

import (

	eks "github.com/aws/aws-cdk-go/awscdk/awseks"
	ec2 "github.com/aws/aws-cdk-go/awscdk/awsec2"
	iam "github.com/aws/aws-cdk-go/awscdk/awsiam"
	autoscaling "github.com/aws/aws-cdk-go/awscdk/awsautoscaling"
	cdk "github.com/aws/aws-cdk-go/awscdk"
	jsii "github.com/aws/jsii-runtime-go"

)

func main() {

	app := cdk.NewApp(nil)
	stack := cdk.NewStack(app, jsii.String("MyEKSCluster"), nil)

	vpc := ec2.NewVpc(stack, jsii.String("EKSVpc"), nil) // Create a new VPC for our cluster

	// IAM role for our EC2 worker nodes
	workerRole := iam.NewRole(stack, jsii.String("EKSWorkerRole"), &iam.RoleProps{
		AssumedBy: iam.NewServicePrincipal(jsii.String("ec2.amazonaws.com"), nil),
	});

	eksCluster := eks.NewCluster(stack, jsii.String("Cluster"), &eks.ClusterProps{
		Vpc: vpc,
		DefaultCapacity: jsii.Number(0), // we want to manage capacity our selves
		Version: eks.KubernetesVersion_V1_16(),
	})

	onDemandASG := autoscaling.NewAutoScalingGroup(stack, jsii.String("OnDemandASG"), &autoscaling.AutoScalingGroupProps{
		Vpc: vpc,
		Role: workerRole,
		MinCapacity: jsii.Number(1),
		MaxCapacity: jsii.Number(10),
		InstanceType: ec2.NewInstanceType(jsii.String("t3.medium")),
		MachineImage: eks.NewEksOptimizedImage(&eks.EksOptimizedImageProps{
			KubernetesVersion: jsii.String("1.14"),
			NodeType: eks.NodeType_STANDARD,
		}),
		UpdateType: autoscaling.UpdateType_ROLLING_UPDATE,
	});

	eksCluster.ConnectAutoScalingGroupCapacity(onDemandASG, &eks.AutoScalingGroupOptions{});

	app.Synth(nil)
}