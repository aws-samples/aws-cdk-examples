import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import elasticache = require('@aws-cdk/aws-elasticache');
import lambda = require('@aws-cdk/aws-lambda');
import secretsmanager = require('@aws-cdk/aws-secretsmanager')
import path = require('path');


export class SecretsManagerCustomRotationStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterId = 'redisDemoCluster'

    const vpc = new ec2.Vpc(this, "Vpc", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ]
    });

    const secretsManagerEndpoint = vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: {
        subnetType: ec2.SubnetType.ISOLATED,

      }
    });

    secretsManagerEndpoint.connections.allowDefaultPortFromAnyIpv4();


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

    let isolatedSubnets: string[] = []

    vpc.isolatedSubnets.forEach(function(value){
      isolatedSubnets.push(value.subnetId)
    });

    const ecSubnetGroup = new elasticache.CfnSubnetGroup(this, 'ElastiCacheSubnetGroup', {
      description: 'Elasticache Subnet Group',
      subnetIds: isolatedSubnets
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

    // ecClusterReplicationGroup.node.addDependency(redisAuthToken)
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
        resources: ["arn:aws:elasticache:"+cdk.Stack.of(this).region+":"+cdk.Stack.of(this).account+":replicationgroup:"+clusterId],
        actions: [
          "elasticache:ModifyReplicationGroup"
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
      timeout: cdk.Duration.seconds(30),
      vpc: vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE},
      securityGroups: [ecSecurityGroup, rotatorSecurityGroup],
      environment: {
        replicationGroupId: ecClusterReplicationGroup.ref,
        redis_endpoint: ecClusterReplicationGroup.attrPrimaryEndPointAddress,
        redis_port: ecClusterReplicationGroup.attrPrimaryEndPointPort,
        EXCLUDE_CHARACTERS: '@%*()_+=`~{}|[]\\:";\'?,./',
        SECRETS_MANAGER_ENDPOINT: "https://secretsmanager."+cdk.Stack.of(this).region+".amazonaws.com"
      }
    });

    secret.addRotationSchedule('RotationSchedule', {
      rotationLambda: fn,
      automaticallyAfter: cdk.Duration.days(15)
    });

    secret.grantRead(fn);

    fn.grantInvoke(new iam.ServicePrincipal('secretsmanager.amazonaws.com'))


  }
}

const app = new cdk.App();
new SecretsManagerCustomRotationStack(app, 'SecretsManagerCustomRotationStack');
app.synth();