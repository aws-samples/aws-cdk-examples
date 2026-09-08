import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as aoss from 'aws-cdk-lib/aws-opensearchserverless';
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { Construct } from 'constructs';

/**
 * Replicates an Amazon Neptune graph into an Amazon OpenSearch Serverless
 * collection so Neptune can answer full-text search in Gremlin and SPARQL.
 *
 * AWS publishes this integration only as a CloudFormation quick-start that
 * targets a managed OpenSearch domain. This stack builds the same replication
 * path in CDK against a Serverless collection on the NextGen architecture.
 *
 * Two requirements are not optional, both from the Neptune user guide:
 *
 *   1. IAM authentication MUST be enabled on the Neptune cluster. Clusters with
 *      IAM auth disabled are not supported with OpenSearch Serverless.
 *   2. The poller's execution role must appear in the collection's DATA ACCESS
 *      policy. An IAM grant alone does not reach collection data.
 */
export class NeptuneToOpenSearchServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Collection names are used inside the serverless policy documents, which
    // take name patterns rather than ARNs, so it is declared once here.
    const collectionName = 'neptune-fts';
    const indexName = 'amazon_neptune';

    // ---------------------------------------------------------------------
    // Network
    // ---------------------------------------------------------------------
    // Neptune, the poller, and the collection endpoint all sit in the same VPC.
    // Isolated subnets keep the database off the internet; the poller reaches
    // AWS APIs through VPC endpoints rather than a NAT gateway.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.192.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'db',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // The poller keeps its stream position in DynamoDB, so it needs a gateway
    // endpoint to reach the table from an isolated subnet.
    vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // ---------------------------------------------------------------------
    // Neptune cluster, with streams turned on
    // ---------------------------------------------------------------------
    // neptune_streams=1 is what makes the change log readable at all. Without
    // it the poller's stream endpoint returns an error rather than records.
    const clusterParameterGroup = new neptune.ClusterParameterGroup(this, 'ClusterParams', {
      description: 'Enables Neptune Streams for OpenSearch replication',
      // The family must match the engine version below. The construct defaults
      // to neptune1, which will not accept a 1.3.0.0 cluster.
      family: neptune.ParameterGroupFamily.NEPTUNE_1_3,
      parameters: {
        neptune_streams: '1',
      },
    });

    const cluster = new neptune.DatabaseCluster(this, 'Cluster', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: neptune.InstanceType.R5_LARGE,
      clusterParameterGroup,
      // Required for OpenSearch Serverless. Neptune rejects the pairing when
      // IAM auth is off.
      iamAuthentication: true,
      // Engine 1.3.0.0 or later is the first release that supports Serverless.
      engineVersion: neptune.EngineVersion.V1_3_0_0,
      // Both settings below keep the example easy to tear down. Do not copy
      // them into a production cluster.
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ---------------------------------------------------------------------
    // OpenSearch Serverless, NextGen
    // ---------------------------------------------------------------------
    // NextGen requires a collection group, and the group is where the
    // generation and the capacity floor are set. Minimum 0 OCU is what lets the
    // collection scale to zero while idle, so an example left running costs
    // nothing for search and indexing.
    const collectionGroup = new aoss.CfnCollectionGroup(this, 'CollectionGroup', {
      name: 'neptune-fts-group',
      generation: 'NEXTGEN',
      standbyReplicas: 'DISABLED',
      capacityLimits: {
        minIndexingCapacityInOcu: 0,
        maxIndexingCapacityInOcu: 2,
        minSearchCapacityInOcu: 0,
        maxSearchCapacityInOcu: 2,
      },
    });

    // A collection cannot be created without a matching encryption policy, so
    // this is a hard ordering dependency rather than a stylistic one.
    const encryptionPolicy = new aoss.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: 'neptune-fts-encryption',
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
          },
        ],
        AWSOwnedKey: true,
      }),
    });

    // NextGen collection endpoints live on on.aws and are reached through a
    // STANDARD PrivateLink interface endpoint, created through the EC2 API like
    // any other service. The OpenSearch Serverless-managed endpoint
    // (AWS::OpenSearchServerless::VpcEndpoint) is the Classic path and does not
    // apply here. Private DNS resolves the NextGen collection hostnames.
    const collectionSecurityGroup = new ec2.SecurityGroup(this, 'CollectionEndpointSg', {
      vpc,
      description: 'OpenSearch Serverless data plane endpoint',
      allowAllOutbound: true,
    });

    const collectionVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CollectionVpcEndpoint', {
      vpc,
      service: new ec2.InterfaceVpcEndpointService(
        `com.amazonaws.${cdk.Stack.of(this).region}.aoss-data`,
        443,
      ),
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [collectionSecurityGroup],
      privateDnsEnabled: true,
    });

    // VPC-only access. AllowFromPublic is deliberately false: the poller and
    // Neptune are both inside the VPC, so the collection never needs a public
    // endpoint. A network policy with AllowFromPublic false and no SourceVPCEs
    // grants nothing at all, so the endpoint id has to be named here. A standard
    // interface endpoint's vpce- id is accepted here exactly like a managed one.
    const networkPolicy = new aoss.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: 'neptune-fts-network',
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
            },
          ],
          AllowFromPublic: false,
          SourceVPCEs: [collectionVpcEndpoint.vpcEndpointId],
        },
      ]),
    });

    const collection = new aoss.CfnCollection(this, 'Collection', {
      name: collectionName,
      type: 'SEARCH',
      description: 'Full-text search index replicated from Neptune',
      collectionGroupName: collectionGroup.name,
    });
    collection.addResourceDependency(collectionGroup);
    collection.addResourceDependency(encryptionPolicy);
    collection.addResourceDependency(networkPolicy);

    // ---------------------------------------------------------------------
    // Checkpoint table
    // ---------------------------------------------------------------------
    // One row, holding the last stream position the poller committed. This is
    // what makes the poller resumable instead of re-reading from the start.
    const checkpointTable = new dynamodb.Table(this, 'CheckpointTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ---------------------------------------------------------------------
    // Poller Lambda
    // ---------------------------------------------------------------------
    const pollerSecurityGroup = new ec2.SecurityGroup(this, 'PollerSecurityGroup', {
      vpc,
      description: 'Neptune stream poller',
      allowAllOutbound: true,
    });

    const poller = new lambda.Function(this, 'Poller', {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/poller'),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [pollerSecurityGroup],
      // Must stay BELOW the schedule interval below, so one invocation cannot
      // still be running when the next is due.
      timeout: cdk.Duration.minutes(4),
      // AWS's own stream poller defaults to 2048 MB at this batch size; memory
      // requirement scales with the number of records held per batch.
      memorySize: 2048,
      // THE SINGLE-WRITER GUARANTEE. Neptune Streams is unsharded and strictly
      // ordered, and every poller shares one checkpoint row, so two concurrent
      // pollers would interleave batches and rewind progress. Reserved
      // concurrency of 1 makes a second concurrent invocation impossible, and
      // costs nothing (unlike provisioned concurrency, it is not billed).
      reservedConcurrentExecutions: 1,
      environment: {
        // Read the stream from the reader endpoint. Stream reads consume the
        // same resources as ordinary graph queries, so AWS recommends serving
        // them from a replica rather than competing with the writer. This
        // cluster has a single instance, so the reader endpoint resolves to it
        // today, but the example stays correct if replicas are added.
        NEPTUNE_STREAM_ENDPOINT: `https://${cluster.clusterReadEndpoint.socketAddress}/propertygraph/stream`,
        COLLECTION_ENDPOINT: collection.attrCollectionEndpoint,
        CHECKPOINT_TABLE: checkpointTable.tableName,
        INDEX_NAME: indexName,
      },
    });

    checkpointTable.grantReadWriteData(poller);

    // The poller reads the stream over an IAM-authenticated connection, so it
    // needs both a Neptune data-access grant and network reach to the cluster.
    cluster.grantConnect(poller);
    cluster.connections.allowDefaultPortFrom(pollerSecurityGroup, 'Neptune stream reads');

    // aoss:APIAccessAll is the IAM half of collection access. The data access
    // policy below is the other half, and both are required.
    poller.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['aoss:APIAccessAll'],
        resources: [collection.attrArn],
      }),
    );

    // Network reach to the collection's VPC endpoint. TWO callers need it, which
    // is easy to miss: the poller WRITES documents, and Neptune itself READS
    // them. The OpenSearch endpoint is supplied per query
    // (withSideEffect("Neptune#fts.endpoint", ...) in Gremlin, neptune-fts:endpoint
    // in SPARQL), so the cluster makes its own outbound call to the collection.
    // Without the second rule, replication works and every full-text search
    // query fails.
    collectionSecurityGroup.addIngressRule(
      pollerSecurityGroup,
      ec2.Port.tcp(443),
      'Poller writes to the collection',
    );
    collectionSecurityGroup.connections.allowFrom(
      cluster,
      ec2.Port.tcp(443),
      'Neptune runs full-text search queries against the collection',
    );

    // Without this policy the poller authenticates and is then refused by the
    // collection. This is the step most often missed when moving from a managed
    // domain to Serverless.
    const dataAccessPolicy = new aoss.CfnAccessPolicy(this, 'DataAccessPolicy', {
      name: 'neptune-fts-data-access',
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'index',
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DescribeIndex',
                'aoss:UpdateIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
              ],
            },
          ],
          Principal: [poller.role!.roleArn],
        },
      ]),
    });
    dataAccessPolicy.addResourceDependency(collectionGroup);

    // ---------------------------------------------------------------------
    // Polling schedule
    // ---------------------------------------------------------------------
    // Neptune Streams cannot be a Lambda event source, so the poller runs on a
    // timer. The interval is deliberately LONGER than the poller's timeout: an
    // interval shorter than the runtime is what lets two pollers overlap. The
    // poller drains continuously within each invocation, so a longer interval
    // costs latency, not throughput.
    //
    // AWS's own streams-consumer avoids the timer entirely: its Lambda
    // self-schedules through Step Functions and holds a DynamoDB lease, so the
    // next poll is caused by the previous one finishing. That is a faithful but
    // much larger design; this example uses a schedule plus reserved
    // concurrency to get the same single-writer guarantee.
    new events.Rule(this, 'PollSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(poller)],
      description: 'Drives the Neptune stream poller',
    });

    // ---------------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------------
    // This endpoint is the value Neptune's full-text-search parameter needs.
    new cdk.CfnOutput(this, 'CollectionEndpoint', {
      value: collection.attrCollectionEndpoint,
      description: 'Set this as the Neptune full-text search endpoint',
    });

    new cdk.CfnOutput(this, 'NeptuneClusterEndpoint', {
      value: cluster.clusterEndpoint.socketAddress,
      description: 'Neptune cluster write endpoint',
    });

    new cdk.CfnOutput(this, 'NeptuneClusterResourceId', {
      value: cluster.clusterResourceIdentifier,
      description: 'Needed when granting IAM data access to Neptune',
    });
  }
}
