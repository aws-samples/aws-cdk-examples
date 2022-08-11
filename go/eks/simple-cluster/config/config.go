package config

import (
	"fmt"
	"reflect"
	"strconv"

	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// DO NOT modify this function, change stack name by 'cdk.json/context/stackName'.
func StackName(scope constructs.Construct) string {
	stackName := "MyEKSClusterStack"

	ctxValue := scope.Node().TryGetContext(jsii.String("stackName"))
	if v, ok := ctxValue.(string); ok {
		stackName = v
	}

	stackName = fmt.Sprintf("%s-%s", stackName, string(TargetArch(scope)))

	return stackName
}

// DO NOT modify this function, change EKS cluster name by 'cdk.json/context/clusterName'.
func ClusterName(scope constructs.Construct) string {
	clusterName := "MyEKSCluster"

	ctxValue := scope.Node().TryGetContext(jsii.String("clusterName"))
	if v, ok := ctxValue.(string); ok {
		clusterName = v
	}

	clusterName = fmt.Sprintf("%s-%s", clusterName, string(TargetArch(scope)))

	return clusterName
}

// DO NOT modify this function, change EC2 key pair name by 'cdk.json/context/keyPairName'.
func KeyPairName(scope constructs.Construct) string {
	keyPairName := "MyKeyPair"

	ctxValue := scope.Node().TryGetContext(jsii.String("keyPairName"))
	if v, ok := ctxValue.(string); ok {
		keyPairName = v
	}

	return keyPairName
}

// Master users in k8s system:masters. All users must be existing IAM Users
// DO NOT modify this function, change master IAM users by 'cdk.json/context/masterUsers'.
func MasterUsers(scope constructs.Construct) []string {
	var masterUsers []string

	ctxValue := scope.Node().TryGetContext(jsii.String("masterUsers"))
	iamUsers := reflect.ValueOf(ctxValue)
	if iamUsers.Kind() != reflect.Slice {
		return masterUsers
	}

	for i := 0; i < iamUsers.Len(); i++ {
		user := iamUsers.Index(i).Interface().(string)
		masterUsers = append(masterUsers, user)
	}

	return masterUsers
}

// Deployment stage config
type DeploymentStageType string

const (
	DeploymentStage_DEV  DeploymentStageType = "DEV"
	DeploymentStage_PROD DeploymentStageType = "PROD"
)

// DO NOT modify this function, change EKS cluster name by 'cdk-cli-wrapper-dev.sh/--context deploymentStage='.
func DeploymentStage(scope constructs.Construct) DeploymentStageType {
	deploymentStage := DeploymentStage_PROD

	ctxValue := scope.Node().TryGetContext(jsii.String("deploymentStage"))
	if v, ok := ctxValue.(string); ok {
		deploymentStage = DeploymentStageType(v)
	}

	return deploymentStage
}

// DO NOT modify this function, change EKS cluster nodegroup's archtecture type by 'cdk.json/context/targetArch'.
// Allowed values are: amd64, arm64.
type TargetArchType string

const (
	TargetArch_x86 TargetArchType = "amd64"
	TargetArch_arm TargetArchType = "arm64"
)

func TargetArch(scope constructs.Construct) TargetArchType {
	targetArch := TargetArch_x86

	ctxValue := scope.Node().TryGetContext(jsii.String("targetArch"))
	if v, ok := ctxValue.(string); ok {
		targetArch = TargetArchType(v)
	}

	return targetArch
}

// VPC config
const vpcMask = 16
const vpcIpv4 = "192.168.0.0"

var VpcCidr = vpcIpv4 + "/" + strconv.Itoa(vpcMask)

const MaxAzs = 3
const SubnetMask = vpcMask + MaxAzs

// DO NOT modify this function, change ExternalDNS role ARN by 'cdk.json/context/externalDnsRole'.
func ExternalDnsRole(scope constructs.Construct) string {
	// The 'cdk.json/context/externalDnsRole' is a role defined in target account with permission policy:
	/*
		{
			"Version": "2012-10-17",
			"Statement": [
				{
				"Effect": "Allow",
				"Action": [
					"route53:ChangeResourceRecordSets"
				],
				"Resource": [
					"arn:aws:route53:::hostedzone/*"
				]
				},
				{
				"Effect": "Allow",
				"Action": [
					"route53:ListHostedZones",
					"route53:ListResourceRecordSets"
				],
				"Resource": [
					"*"
				]
				}
			]
		}
	*/
	// and trust policy:
	/*
		{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {
						"AWS": "arn:aws:iam::123456789012:root" // Or IAM role arn that associated with external-dns service account.
					},
					"Action": "sts:AssumeRole",
					"Condition": {}
				}
			]
		}
	*/
	externalDnsRole := ""

	ctxValue := scope.Node().TryGetContext(jsii.String("externalDnsRole"))
	if v, ok := ctxValue.(string); ok {
		externalDnsRole = v
	}

	return externalDnsRole
}
