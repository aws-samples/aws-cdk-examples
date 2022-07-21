
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { Construct } from 'constructs';

export class NeptuneWithVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for use with Neptune
    const neptuneVpc = new ec2.Vpc(this, "NeptuneVpc", {
      cidr: "10.192.0.0/16",
      maxAzs: 2,
      natGateways: 0,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      /**
       * Each entry in this list configures a Subnet Group
       *
       * ISOLATED: Isolated Subnets do not route traffic to the Internet (in this VPC).
       * PRIVATE.: Subnet that routes to the internet, but not vice versa.
       * PUBLIC..: Subnet connected to the Internet.
       */
      subnetConfiguration: [{
        cidrMask: 24,
        name: 'db',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }, {
        cidrMask: 24,
        name: 'dmz',
        subnetType: ec2.SubnetType.PUBLIC,
      }],
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, "VPCId", {
      value: neptuneVpc.vpcId,
      description: "Neptune VPC ID",
      exportName: "NeptuneWithVpcStack:vpcId"
    });

    // Get lists of Subnets by type
    var neptunePublicSubnets = neptuneVpc.publicSubnets;
    var neptunePrivateSubnets = neptuneVpc.privateSubnets;
    var neptuneIsolatedSubnets = neptuneVpc.isolatedSubnets;

    // Create Subnet group list to be used with Neptune.
    const neptuneSubnets: ec2.SubnetSelection = { subnets: neptuneIsolatedSubnets };

    // Create Neptune Cluster
    const clusterParams = new neptune.ClusterParameterGroup(this, 'ClusterParams', {
      description: 'Cluster parameter group',
      parameters: {
        neptune_enable_audit_log: '1'
      },
    });

    const dbParams = new neptune.ParameterGroup(this, 'DbParams', {
      description: 'Db parameter group',
      parameters: {
        neptune_query_timeout: '120000'
      },
    });

    const neptuneCluster = new neptune.DatabaseCluster(this, "NeptuneCluster", {
      dbClusterName: "MyGraphDB",
      vpc: neptuneVpc,
      vpcSubnets: neptuneSubnets,
      instanceType: neptune.InstanceType.R5_LARGE,
      clusterParameterGroup: clusterParams,
      parameterGroup: dbParams,
      deletionProtection: false, // Not recommended for production clusters. This is enabled to easily delete the example stack.
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Not recommended for production clusters. This is enabled to easily delete the example stack.
    });

    // Update Neptune Security Group to allow-all-in
    neptuneCluster.connections.allowDefaultPortFromAnyIpv4('Allow From All');

    // Add tags to all assets within this stack
    cdk.Tags.of(this).add("CreatedBy", "CDK", { priority: 300 })
    cdk.Tags.of(this).add("Purpose", "Neptune Cluster", { priority: 300 })
    cdk.Tags.of(this).add('Owner', 'CDK', { priority: 300 });

    // Output the Neptune read/write addresses
    const neptuneClusterWriteAddress = neptuneCluster.clusterEndpoint.socketAddress;
    const neptuneClusterReadAddress = neptuneCluster.clusterReadEndpoint.socketAddress;

    new cdk.CfnOutput(this, 'NeptuneClusterReadAddress', {
      value: neptuneClusterReadAddress,
      description: "Neptune Cluster Read Address",
      exportName: "NeptuneWithVpcStack:NeptuneClusterReadAddress"
    });
    new cdk.CfnOutput(this, 'NeptuneClusterWriteAddress', {
      value: neptuneClusterWriteAddress,
      description: "Neptune Cluster Write Address",
      exportName: "NeptuneWithVpcStack:NeptuneClusterWriteAddress"
    });
  }
}
