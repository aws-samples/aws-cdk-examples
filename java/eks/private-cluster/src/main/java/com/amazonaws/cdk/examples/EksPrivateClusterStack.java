package com.amazonaws.cdk.examples;

import java.util.List;
import java.util.Map;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.cdk.lambdalayer.kubectl.v31.KubectlV31Layer;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.ec2.BastionHostLinux;
import software.amazon.awscdk.services.ec2.BlockDevice;
import software.amazon.awscdk.services.ec2.BlockDeviceVolume;
import software.amazon.awscdk.services.ec2.EbsDeviceOptions;
import software.amazon.awscdk.services.ec2.GatewayVpcEndpointAwsService;
import software.amazon.awscdk.services.ec2.GatewayVpcEndpointOptions;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.InterfaceVpcEndpointAwsService;
import software.amazon.awscdk.services.ec2.InterfaceVpcEndpointOptions;
import software.amazon.awscdk.services.ec2.IpAddresses;
import software.amazon.awscdk.services.ec2.SubnetConfiguration;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.eks.AutoScalingGroupCapacityOptions;
import software.amazon.awscdk.services.eks.Cluster;
import software.amazon.awscdk.services.eks.EndpointAccess;
import software.amazon.awscdk.services.eks.KubernetesVersion;
import software.amazon.awscdk.services.iam.AccountRootPrincipal;
import software.amazon.awscdk.services.iam.Effect;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.constructs.Construct;

/**
 * Builds a private EKS cluster in isolated subnets with no Internet or NAT gateways attached.
 *
 * <p>
 */
public class EksPrivateClusterStack extends Stack {
  private Vpc vpc;
  private Cluster cluster;

  public EksPrivateClusterStack(final Construct scope, final String id) {
    this(scope, id, null);
  }

  public EksPrivateClusterStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    createVpc();
    addEndpoints();

    // the cluster admin role to be added in the system:masters of the aws-auth config map of the
    // cluster
    Role clusterAdmin =
        Role.Builder.create(this, "cluster-admin").assumedBy(new AccountRootPrincipal()).build();

    createEksCluster(clusterAdmin);
    addNodes();
    createBastion(clusterAdmin);
  }

  /**
   * Create a VPC with only isolated subnets and no public or private with egress.
   *
   * @return the isolated VPC
   */
  private Vpc createVpc() {
    this.vpc =
        Vpc.Builder.create(this, "vpc")
            .ipAddresses(IpAddresses.cidr("10.0.0.0/16"))
            .maxAzs(2)
            .natGateways(0)
            .subnetConfiguration(
                List.of(
                    SubnetConfiguration.builder()
                        .cidrMask(24)
                        .name("isolated")
                        .subnetType(SubnetType.PRIVATE_ISOLATED)
                        .build()))
            .build();

    return vpc;
  }

  private void createEksCluster(Role clusterAdmin) {
    this.cluster =
        Cluster.Builder.create(this, "eks")
            .vpc(vpc)
            .version(KubernetesVersion.V1_31)
            .vpcSubnets(
                List.of(SubnetSelection.builder().subnetType(SubnetType.PRIVATE_ISOLATED).build()))
            .endpointAccess(EndpointAccess.PRIVATE)
            .clusterName("eks-private")
            .kubectlLayer(new KubectlV31Layer(this, "KubectlLayer"))
            .defaultCapacity(0)
            .mastersRole(clusterAdmin)
            .placeClusterHandlerInVpc(true)
            .clusterHandlerEnvironment(Map.of("AWS_STS_REGIONAL_ENDPOINTS", "regional"))
            .kubectlEnvironment(Map.of("AWS_STS_REGIONAL_ENDPOINTS", "regional"))
            .outputClusterName(true)
            .outputConfigCommand(true)
            .outputMastersRoleArn(true)
            .build();
  }

  private void addNodes() {
    AutoScalingGroup asg =
        this.cluster.addAutoScalingGroupCapacity(
            "nodes",
            AutoScalingGroupCapacityOptions.builder()
                .instanceType(InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM))
                .minCapacity(1)
                .vpcSubnets(
                    SubnetSelection.builder().subnetType(SubnetType.PRIVATE_ISOLATED).build())
                .ssmSessionPermissions(true)
                .machineImageType(null)
                .build());

    asg.addToRolePolicy(
        PolicyStatement.Builder.create()
            .effect(Effect.ALLOW)
            .actions(
                List.of(
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:GetAuthorizationToken"))
            .resources(List.of("*"))
            .build());
  }

  /**
   * Create an EC2 instance in one of the isolated subnet accessible via SSM for kubectl.
   *
   * @param clusterAdmin
   */
  private void createBastion(Role clusterAdmin) {
    BastionHostLinux client =
        BastionHostLinux.Builder.create(this, "kubectl-client")
            .vpc(vpc)
            .instanceName("kubectl-client")
            .blockDevices(
                List.of(
                    BlockDevice.builder()
                        .deviceName("/dev/sdf")
                        .volume(
                            BlockDeviceVolume.ebs(
                                10, EbsDeviceOptions.builder().encrypted(true).build()))
                        .build()))
            .subnetSelection(
                SubnetSelection.builder().subnetType(SubnetType.PRIVATE_ISOLATED).build())
            .securityGroup(this.cluster.getClusterSecurityGroup())
            .instanceType(InstanceType.of(InstanceClass.T3, InstanceSize.SMALL))
            .build();

    // allow the client role to assume the cluster admin role
    clusterAdmin.grantAssumeRole(client.getRole());

    // add permission to allow aws eks update-kubeconfig i.e. DescribeCluster
    client
        .getInstance()
        .addToRolePolicy(
            PolicyStatement.Builder.create()
                .effect(Effect.ALLOW)
                .actions(List.of("eks:DescribeCluster", "eks:ListClusters"))
                .resources(List.of("*"))
                .build());

    // NOTE: In production, restrict the access to specific repositories and buckets
    // add ECR access for client to pull images
    // use ECR pull through to get public images like nginx
    client
        .getRole()
        .addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"));
    // access to read assets from S3 bucket e.g. kubectl, awscliv2, etc
    client
        .getRole()
        .addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess"));

    // add user data to install kubectl and apply the update-kubeconfig
    // add in the env variable
    // export AWS_STS_REGIONAL_ENDPOINTS=regional
  }

  private void addEndpoints() {
    List<InterfaceVpcEndpointAwsService> endpoints =
        List.of(
            InterfaceVpcEndpointAwsService.ECR,
            InterfaceVpcEndpointAwsService.ECR_DOCKER,
            InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
            InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            InterfaceVpcEndpointAwsService.STS,
            InterfaceVpcEndpointAwsService.SSM,
            InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            InterfaceVpcEndpointAwsService.LAMBDA,
            InterfaceVpcEndpointAwsService.EKS,
            InterfaceVpcEndpointAwsService.EC2,
            InterfaceVpcEndpointAwsService.EC2_MESSAGES,
            InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
            InterfaceVpcEndpointAwsService.STEP_FUNCTIONS_SYNC);

    SubnetSelection subnets =
        SubnetSelection.builder().subnetType(SubnetType.PRIVATE_ISOLATED).build();

    for (InterfaceVpcEndpointAwsService e : endpoints) {
      vpc.addInterfaceEndpoint(
          e.getShortName(),
          InterfaceVpcEndpointOptions.builder().service(e).subnets(subnets).build());
    }

    vpc.addGatewayEndpoint(
        "s3", GatewayVpcEndpointOptions.builder().service(GatewayVpcEndpointAwsService.S3).build());
  }

  public Vpc getVpc() {
    return this.vpc;
  }

  public Cluster getCluster() {
    return this.cluster;
  }
}
