import { App, Stack, StackProps, Duration } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib'; 
import { aws_iam as iam } from 'aws-cdk-lib'; 
import { aws_elasticache as elasticache } from 'aws-cdk-lib'; 
import { aws_lambda as lambda } from 'aws-cdk-lib'; 
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib'; 
import path = require('path');

export class SecretsManagerCustomRotationStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const clusterId = 'redis-demo-cluster'

    const vpc = new ec2.Vpc(this, "Vpc", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ]
    });

    const ecSecurityGroup = new ec2.SecurityGroup(this, 'ElastiCacheSG', {
      vpc: vpc,
      description: 'SecurityGroup associated with the ElastiCache Redis Cluster'
    });

    ecSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(6379), 'Redis ingress 6379')

    const rotatorSecurityGroup = new ec2.SecurityGroup(this, 'RotatorSG', {
      vpc: vpc,
      description: 'SecurityGroup for rotator function'
    });

    rotatorSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'All port inbound')

    const privateSubnets = vpc.privateSubnets.map((subnet) => subnet.subnetId);

    const ecSubnetGroup = new elasticache.CfnSubnetGroup(this, 'ElastiCacheSubnetGroup', {
      description: 'Elasticache Subnet Group',
      subnetIds: privateSubnets
    });

    const secret = new secretsmanager.Secret(this, 'RedisAuth', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 'replicationGroupId' : clusterId }),
        generateStringKey: 'authToken',
        excludeCharacters: '@%*()_+=`~{}|[]\\:";\'?,./'
      },
    });

    const ecClusterReplicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisReplicationGroup', {
      replicationGroupDescription: 'RedisReplicationGroup-RBAC-Demo',
      replicationGroupId: clusterId,
      atRestEncryptionEnabled: true,
      multiAzEnabled: true,
      cacheNodeType: 'cache.m4.large',
      cacheSubnetGroupName: ecSubnetGroup.ref,
      engine: "Redis",
      engineVersion: '6.x',
      numNodeGroups: 1,
      replicasPerNodeGroup: 1,
      securityGroupIds: [ecSecurityGroup.securityGroupId],
      transitEncryptionEnabled: true,
      authToken: secret.secretValueFromJson('authToken').toString()
    })

    const rotatorRole = new iam.Role(this, 'rotatorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role to be assumed by producer  lambda',
    });

    rotatorRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    rotatorRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
    rotatorRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [secret.secretArn],
        actions: [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
      })
    );

    rotatorRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["arn:aws:elasticache:"+Stack.of(this).region+":"+Stack.of(this).account+":replicationgroup:"+ecClusterReplicationGroup.replicationGroupId],
        actions: [
          "elasticache:ModifyReplicationGroup",
          "elasticache:DescribeReplicationGroups"
        ]
      })
    );

    rotatorRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: [
          "secretsmanager:GetRandomPassword"
        ]
      })
    );

    const redisPyLayer = new lambda.LayerVersion(this, 'redispy_Layer', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/lib/redis_module/redis_py.zip')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_8, lambda.Runtime.PYTHON_3_7, lambda.Runtime.PYTHON_3_6],
      description: 'A layer that contains the redispy module',
      license: 'MIT License'
    });

    const fn = new lambda.Function(this, 'function', {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'lambda_handler.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
      layers: [redisPyLayer],
      role: rotatorRole,
      timeout: Duration.seconds(30),
      vpc: vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_NAT},
      securityGroups: [ecSecurityGroup, rotatorSecurityGroup],
      environment: {
        replicationGroupId: ecClusterReplicationGroup.ref,
        redis_endpoint: ecClusterReplicationGroup.attrPrimaryEndPointAddress,
        redis_port: ecClusterReplicationGroup.attrPrimaryEndPointPort,
        EXCLUDE_CHARACTERS: '@%*()_+=`~{}|[]\\:";\'?,./',
        SECRETS_MANAGER_ENDPOINT: "https://secretsmanager."+Stack.of(this).region+".amazonaws.com"
      }
    });

    secret.addRotationSchedule('RotationSchedule', {
      rotationLambda: fn,
      automaticallyAfter: Duration.days(15)
    });

    secret.grantRead(fn);

    fn.grantInvoke(new iam.ServicePrincipal('secretsmanager.amazonaws.com'))

  }
}

const app = new App();
new SecretsManagerCustomRotationStack(app, 'SecretsManagerCustomRotationStack');
app.synth();