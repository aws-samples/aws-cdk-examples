import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import elasticache = require('@aws-cdk/aws-elasticache');
import secretsmanager = require('@aws-cdk/aws-secretsmanager')
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');

export interface SecretRotatorProps {
  vpc: ec2.Vpc,
  vpcSubnets: ec2.SubnetSelection,
  securityGroups: [ec2.SecurityGroup],
  // secret: secretsmanager.Secret,
  elastiCacheReplicationGroup?: elasticache.CfnReplicationGroup
}

export class SecretRotator extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: SecretRotatorProps) {
    super(scope, id);

    // this.secret = new secretsmanager.Secret(this, 'RedisAuth', {
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({ 'clusterId' : 'user' }),
    //     generateStringKey: 'authToken',
    //     excludeCharacters: '@%*()_+=`~{}|[]\\:";\'?,./'
    //   },
    // });

    // const rotatorRole = new iam.Role(this, 'rotatorRole', {
    //   assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    //   description: 'Role to be assumed by producer  lambda',
    // });

    // const rotatorLambda = new lambda.Function(this, 'function', {
    //   runtime: lambda.Runtime.PYTHON_3_7,
    //   handler: 'lambda_handler.lambda_handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
    //   //layers: [redisPyLayer],
    //   role: rotatorRole,
    //   vpc: props.vpc,
    //   vpcSubnets: props.vpcSubnets,
    //   securityGroups: props.securityGroups
    // });

    // rotatorRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    // rotatorRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));

    const fn = new lambda.Function(this, 'function', {
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: 'lambda_handler.lambda_handler',
        code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
        //layers: [redisPyLayer],
        // role: rotatorRole,
        vpc: props.vpc,
        vpcSubnets: props.vpcSubnets,
        securityGroups: props.securityGroups
      });

    const mysecret = new secretsmanager.Secret(this, 'Secret');

    // secretsmanager.SecretRotation(this, 'rotation',  {

    // })


  }
}
