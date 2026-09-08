import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { NeptuneToOpenSearchServerlessStack } from '../lib/neptune-to-opensearch-serverless-stack';

let template: Template;

beforeAll(() => {
  const app = new cdk.App();
  const stack = new NeptuneToOpenSearchServerlessStack(app, 'TestStack', {
    env: { region: 'us-east-1', account: '123456789012' },
  });
  template = Template.fromStack(stack);
});

describe('Neptune source', () => {
  // Without this parameter there is no change log to replicate, so the whole
  // example is inert.
  test('streams are enabled on the cluster parameter group', () => {
    template.hasResourceProperties('AWS::Neptune::DBClusterParameterGroup', {
      Parameters: { neptune_streams: '1' },
    });
  });

  // The family has to track the engine version; neptune1 will not accept a
  // 1.3.0.0 cluster.
  test('parameter group family matches the 1.3 engine', () => {
    template.hasResourceProperties('AWS::Neptune::DBClusterParameterGroup', {
      Family: 'neptune1.3',
    });
  });

  // Neptune refuses to pair with OpenSearch Serverless when IAM auth is off,
  // so this is a hard requirement rather than a hardening choice.
  test('IAM authentication is enabled', () => {
    template.hasResourceProperties('AWS::Neptune::DBCluster', {
      IamAuthEnabled: true,
    });
  });

  test('engine is at least the 1.3.0.0 release that supports Serverless', () => {
    template.hasResourceProperties('AWS::Neptune::DBCluster', {
      EngineVersion: '1.3.0.0',
    });
  });
});

describe('OpenSearch Serverless target', () => {
  test('collection group requests the NextGen architecture', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::CollectionGroup', {
      Generation: 'NEXTGEN',
    });
  });

  // Minimum 0 OCU is what makes an idle example free; a nonzero floor bills
  // continuously.
  test('capacity floor is zero so the collection scales to zero', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::CollectionGroup', {
      CapacityLimits: Match.objectLike({
        MinIndexingCapacityInOcu: 0,
        MinSearchCapacityInOcu: 0,
      }),
    });
  });

  test('collection is a SEARCH collection inside the group', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
      Type: 'SEARCH',
      CollectionGroupName: 'neptune-fts-group',
    });
  });

  // A collection cannot be created before its encryption policy exists.
  test('collection depends on its encryption and network policies', () => {
    const collections = template.findResources('AWS::OpenSearchServerless::Collection');
    const dependsOn = Object.values(collections)[0].DependsOn as string[];
    expect(dependsOn).toContain('EncryptionPolicy');
    expect(dependsOn).toContain('NetworkPolicy');
    expect(dependsOn).toContain('CollectionGroup');
  });

  test('encryption policy exists for the collection', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
      Type: 'encryption',
    });
  });
});

describe('access control', () => {
  // The classic mistake when moving from a managed domain to Serverless is
  // granting IAM only. Both halves must be present.
  test('poller role is granted aoss:APIAccessAll', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'aoss:APIAccessAll',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('a data access policy exists and names the poller role', () => {
    const policies = template.findResources('AWS::OpenSearchServerless::AccessPolicy');
    expect(Object.keys(policies)).toHaveLength(1);
    const policy = JSON.stringify(Object.values(policies)[0].Properties.Policy);
    expect(policy).toContain('aoss:WriteDocument');
    // The role ARN is injected by Fn::GetAtt rather than being a literal.
    expect(policy).toContain('PollerServiceRole');
  });

  // AllowFromPublic false with an empty SourceVPCEs grants nothing, which is a
  // silent failure rather than a deploy error.
  test('network policy is VPC-scoped and names a VPC endpoint', () => {
    const policies = template.findResources('AWS::OpenSearchServerless::SecurityPolicy');
    const network = Object.values(policies).find(
      (p) => p.Properties.Type === 'network',
    );
    expect(network).toBeDefined();
    const policy = JSON.stringify(network!.Properties.Policy);
    expect(policy).toContain('"AllowFromPublic\\":false');
    expect(policy).toContain('SourceVPCEs');
    expect(policy).toContain('CollectionVpcEndpoint');
  });

  // NextGen is reached through a STANDARD PrivateLink interface endpoint on the
  // aoss-data service, not the Classic OpenSearch Serverless-managed endpoint.
  test('a standard aoss-data interface endpoint is created, not a Classic managed one', () => {
    template.resourceCountIs('AWS::OpenSearchServerless::VpcEndpoint', 0);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: 'com.amazonaws.us-east-1.aoss-data',
      VpcEndpointType: 'Interface',
      PrivateDnsEnabled: true,
    });
  });

  // Both the poller and Neptune call the collection: the poller writes documents,
  // and Neptune reads them, because the endpoint is passed per query. Granting
  // only the poller leaves replication working and every search failing.
  test('both the poller and Neptune can reach the collection endpoint', () => {
    const ingress = template.findResources('AWS::EC2::SecurityGroupIngress');
    const on443 = Object.values(ingress).filter(
      (r) => r.Properties.FromPort === 443,
    );
    const descriptions = on443.map((r) => r.Properties.Description as string);

    expect(descriptions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Poller writes'),
        expect.stringContaining('Neptune runs full-text search'),
      ]),
    );
  });
});

describe('poller', () => {
  test('runs in the VPC with the endpoints it needs', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      VpcConfig: Match.objectLike({
        SubnetIds: Match.anyValue(),
      }),
    });
  });

  test('receives the stream, collection and checkpoint configuration', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          NEPTUNE_STREAM_ENDPOINT: Match.anyValue(),
          COLLECTION_ENDPOINT: Match.anyValue(),
          CHECKPOINT_TABLE: Match.anyValue(),
        }),
      },
    });
  });

  // Neptune Streams is unsharded and strictly ordered and every poller shares
  // one checkpoint row, so a second concurrent poller would rewind progress.
  test('is pinned to a single concurrent execution', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      ReservedConcurrentExecutions: 1,
    });
  });

  // AWS's own poller defaults to 2048 MB at this batch size.
  test('is sized to match the reference poller', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      MemorySize: 2048,
    });
  });

  // Neptune Streams cannot be a Lambda event source, so a schedule is the only
  // thing that drives replication.
  test('is driven by a schedule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(5 minutes)',
      State: 'ENABLED',
    });
  });

  // The overlap hazard is an interval shorter than the runtime, so this
  // relationship is the invariant, not either number on its own.
  test('the schedule interval is longer than the poller timeout', () => {
    const functions = template.findResources('AWS::Lambda::Function', {
      Properties: { Handler: 'index.handler' },
    });
    const timeoutSeconds = Object.values(functions)[0].Properties.Timeout;

    const rules = template.findResources('AWS::Events::Rule');
    const expression = Object.values(rules)[0].Properties.ScheduleExpression;
    const minutes = Number(/rate\((\d+) minutes?\)/.exec(expression)![1]);

    expect(timeoutSeconds).toBeLessThan(minutes * 60);
  });

  test('has a checkpoint table to resume from', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
    });
  });

  test('reaches DynamoDB without a NAT gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Gateway',
    });
  });
});
