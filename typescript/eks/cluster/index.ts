import { KubectlV31Layer as KubectlLayer } from "@aws-cdk/lambda-layer-kubectl-v31";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";

const kubernetesVersion = eks.KubernetesVersion.V1_31;

const clusterLogging = [
  // eks.ClusterLoggingTypes.API,
  // eks.ClusterLoggingTypes.AUTHENTICATOR,
  // eks.ClusterLoggingTypes.SCHEDULER,
  eks.ClusterLoggingTypes.AUDIT,
  // eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
];

const instanceTypes = [
  new ec2.InstanceType("m5.large"),
  new ec2.InstanceType("m5a.large"),
];

class EKSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a new VPC for our cluster
    const vpc = new ec2.Vpc(this, "EKSVpc");

    // Create Cluster with no default capacity (node group will be added later)
    const eksCluster = new eks.Cluster(this, "EKSCluster", {
      vpc: vpc,
      defaultCapacity: 0,
      version: kubernetesVersion,
      kubectlLayer: new KubectlLayer(this, "kubectl"),
      ipFamily: eks.IpFamily.IP_V4,
      clusterLogging: clusterLogging,
    });

    // HINT: required cdk v2.135.0 or higher version to support instanceTypes assignment when working with AL2023
    // - https://github.com/aws/aws-cdk/pull/29505
    // - https://github.com/aws/aws-cdk/releases/tag/v2.135.0
    eksCluster.addNodegroupCapacity("custom-node-group", {
      amiType: eks.NodegroupAmiType.AL2023_X86_64_STANDARD,
      instanceTypes: instanceTypes,
      desiredSize: 2,
      minSize: 2,
      maxSize: 5,
      diskSize: 20,
      nodeRole: new iam.Role(this, "eksClusterNodeGroupRole", {
        roleName: "eksClusterNodeGroupRole",
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          "AmazonEKSWorkerNodePolicy",
          "AmazonEC2ContainerRegistryReadOnly",
          "AmazonEKS_CNI_Policy",
        ].map((policy) => iam.ManagedPolicy.fromAwsManagedPolicyName(policy)),
      }),
    });

    // Fargate
    new eks.FargateProfile(this, "myProfile", {
      cluster: eksCluster,
      selectors: [{ namespace: "default" }],
    });

    // Managed Addons
    const addManagedAddon = (id: string, addonName: string) => {
      new eks.CfnAddon(this, id, {
        addonName,
        clusterName: eksCluster.clusterName,
      });
    };

    addManagedAddon("addonKubeProxy", "kube-proxy");
    addManagedAddon("addonCoreDns", "coredns");
    addManagedAddon("addonVpcCni", "vpc-cni");
    addManagedAddon("addonEksPodIdentityAgent", "eks-pod-identity-agent");
    addManagedAddon("addonMetricsServer", "metrics-server");
  }
}

const app = new cdk.App();
new EKSCluster(app, "MyEKSCluster");
app.synth();
