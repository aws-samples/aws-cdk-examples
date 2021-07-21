import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as elbtargets from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as elbactions from '@aws-cdk/aws-elasticloadbalancingv2-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as cog from '@aws-cdk/aws-cognito';
import * as neptune from '@aws-cdk/aws-neptune';
import { ApplicationProtocol, TargetType } from '@aws-cdk/aws-elasticloadbalancingv2';
import { AmazonLinuxGeneration, AmazonLinuxImage, InstanceClass, InstanceSize } from '@aws-cdk/aws-ec2';
import { AccountPrincipal, ManagedPolicy, ServicePrincipal } from '@aws-cdk/aws-iam';
import { RemovalPolicy } from '@aws-cdk/core';

export class Ec2NeptuneGraphnotebookStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3BucketName = process.env.S3BUCKETNAME || "MissingS3Bucket";
    const certificateArn = process.env.CERTIFICATEARN || "No certificate ARN provided";
    const jhUsername = process.env.JHUSERNAME || "No username provided";
    const cogUserPoolArn = process.env.COGUSERPOOLARN || "No Cognito User Pool provided";
    const cogUserPoolId = process.env.COGUSERPOOLID || "No Cognito User Pool Id provided";
    const cogDomain = process.env.COGDOMAIN || "No Cognito Domain provided";
    const neptuneTagKey = process.env.NEPTUNETAGKEY || "No tag for Neptune cluster provided";
    const neptuneTagValue = process.env.NEPTUNETAGVALUE || "No value for Neptune cluster provided";

    // Create VPC and subnets
    // We'll go with defaults for NACL and routing
    const vpc = new ec2.Vpc(this, 'TheVPC', {
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'pub_a',
          cidrMask: 24,
        },
        {
          subnetType: ec2.SubnetType.PRIVATE,
          name: 'priv_a',
          cidrMask: 24,
        }
      ]
    })

    const neptune2SG = new ec2.SecurityGroup(this, 'NeptuneSG', {vpc: vpc, allowAllOutbound: true, description: 'Allow access to Neptune', securityGroupName: 'NeptuneSG'});
    neptune2SG.addIngressRule(neptune2SG, ec2.Port.tcp(8182), 'Allow connections ec2 to neptune');
    // create neptune cluster
    const cluster = new neptune.DatabaseCluster(this, 'NeptuneCluster', {
      vpc: vpc,
      instanceType: neptune.InstanceType.R5_LARGE,
      iamAuthentication: true,
      securityGroups: [neptune2SG],
      removalPolicy: RemovalPolicy.DESTROY
    });

    // create policy to read s3 bucket
    // we need this to get the jupyterhub authenticator and user-data script
    const s3policy = new iam.Policy(this, 'S3ReadSourceBucket');
    const s3policyStatement = new iam.PolicyStatement({effect: iam.Effect.ALLOW});
    s3policyStatement.addResources(`arn:aws:s3:::${s3BucketName}`);
    s3policyStatement.addResources(`arn:aws:s3:::${s3BucketName}/*`);
    s3policyStatement.addActions('s3:GetObject', 's3:HeadObject');
    s3policy.addStatements(s3policyStatement);
    // Create IAM instance role
    const ec2Role = new iam.Role(this, 'GraphNotebookRole', {assumedBy: new ServicePrincipal('ec2.amazonaws.com'), description: 'Role for EC2', managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')], roleName: 'GraphNotebookRole'})
    // ec2 read-only
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this, 'ec2ReadOnly','arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess'));    
    // add s3 policy from above
    s3policy.attachToRole(ec2Role);
    // policy to allow sts:AssumeRole
    const stsAssumeRole = new iam.Policy(this, "stsAssumeRole");
    const stsAssumeRoleStatement = new iam.PolicyStatement({effect: iam.Effect.ALLOW});
    stsAssumeRoleStatement.addResources("*");
    stsAssumeRoleStatement.addActions("sts:AssumeRole");
    stsAssumeRole.addStatements(stsAssumeRoleStatement);
    stsAssumeRole.attachToRole(ec2Role);
    // Create Neptune access policy and role
    const neptunePolicy = new iam.Policy(this, "NeptuneConnect");
    const neptunePolicyStatement = new iam.PolicyStatement({effect: iam.Effect.ALLOW});
    neptunePolicyStatement.addResources(`arn:aws:neptune-db:${this.region}:${this.account}:${cluster.clusterResourceIdentifier}/*`);
    neptunePolicyStatement.addActions('neptune-db:connect');
    neptunePolicy.addStatements(neptunePolicyStatement);
    const neptuneAccessPrincipal = new AccountPrincipal(this.account).withConditions({ StringEquals: { "aws:PrincipalTag/authz_id": "${iam:ResourceTag/authz_id}"}});
    const neptuneAccessRole = new iam.Role(this, 'NeptuneAccessRole', {assumedBy: neptuneAccessPrincipal, description: 'Role for Neptune Access', });
    neptunePolicy.attachToRole(neptuneAccessRole);

  // Create security group for ec2 instance and alb
    const ec2SG = new ec2.SecurityGroup(this, 'GraphNotebookSG', {vpc: vpc, allowAllOutbound: true, description: 'Allow access to graph notebook', securityGroupName: 'GraphNotebookSG'});
    const albSG = new ec2.SecurityGroup(this, 'AlbSG', {vpc: vpc, allowAllOutbound: true, description: 'Allow access to Alb', securityGroupName: 'AlbSG'});
    ec2SG.addIngressRule(ec2SG, ec2.Port.tcp(443), 'Allow connections from the ALB');
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow connections from the world');

  // Add certificate
    const cert = elbv2.ListenerCertificate.fromArn(certificateArn);

    // TG
    const tg = new elbv2.ApplicationTargetGroup(this, 'tg-ssl', {vpc: vpc, port: 443, protocol: ApplicationProtocol.HTTPS, targetType: TargetType.INSTANCE});

    // ALB
    const lb = new elbv2.ApplicationLoadBalancer(this, 'alb-neptune', {vpc: vpc, internetFacing: true, securityGroup: albSG});
    lb.addSecurityGroup(ec2SG);
    const lbListener = lb.addListener('Listener', {port: 443, certificates: [cert], open: false});
    // add cognito auth
    const cogAuth = new elbactions.AuthenticateCognitoAction({next: elbv2.ListenerAction.forward([tg]), userPool: cog.UserPool.fromUserPoolArn(this, 'cogPool', cogUserPoolArn), userPoolClient: cog.UserPoolClient.fromUserPoolClientId(this, 'cogPoolClient', cogUserPoolId), userPoolDomain: cog.UserPoolDomain.fromDomainName(this, 'cogPoolDom', cogDomain), onUnauthenticatedRequest: elbv2.UnauthenticatedAction.AUTHENTICATE, scope: 'openid', sessionCookieName: 'AWSELBAuthSessionCookie', sessionTimeout: cdk.Duration.seconds(604800)});
    lbListener.addAction('cogAuthAction', {action: cogAuth});
    
    // create userdata
    const userData = ec2.UserData.forLinux();
    userData.addS3DownloadCommand({bucket: s3.Bucket.fromBucketName(this, 's3Bucket', s3BucketName), bucketKey: 'user-data.sh', 'localFile': '/tmp/user-data.sh'});
    userData.addExecuteFileCommand({filePath: '/tmp/user-data.sh'});
    // launch ec2 instance w/ graph_notebook
    const subnetSelection : ec2.SubnetSelection = {
      subnetType: ec2.SubnetType.PRIVATE
    };
    const instancetype = ec2.InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO);
    const instance = new ec2.Instance(this, 'graph-notebook', {instanceType: instancetype, machineImage: new AmazonLinuxImage({generation: AmazonLinuxGeneration.AMAZON_LINUX_2}), vpc: vpc, role: ec2Role, securityGroup: ec2SG, userData: userData, vpcSubnets: subnetSelection});
    cdk.Tags.of(this).add('USERNAME', jhUsername, {includeResourceTypes: ["AWS::EC2::Instance"]});
    cdk.Tags.of(this).add(neptuneTagKey, neptuneTagValue, {includeResourceTypes: ["AWS::EC2::Instance", "AWS::IAM::Role"]});
    // add to target group
    const ec2target = new elbtargets.InstanceIdTarget(instance.instanceId, 443);
    tg.addTarget(ec2target);

    // The Cognito User Pool needs to be updated with the ALB url
    new cdk.CfnOutput(this, 'albUrl', {
      value: lb.loadBalancerDnsName,
      description: 'ALB URL',
      exportName: 'albUrl'
    });
    new cdk.CfnOutput(this, 'iamRole', {
      value: neptuneAccessRole.roleArn,
      description: 'IAM Role ARN',
      exportName: 'iamRole'
    });
    new cdk.CfnOutput(this, 'neptuneUrl', {
      value: cluster.clusterEndpoint.socketAddress,
      description: 'Neptune URL',
      exportName: 'neptuneUrl'
    });
  }
}
