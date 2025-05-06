import * as path from 'path';
import {
  Stack,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  custom_resources as cr,
  CustomResource,
  Duration,
  aws_s3_assets as assets,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface InstanceConnectEndpointProps {
  /**
   * EC2 subnet for this endpoint
   */
  readonly subnet: ec2.ISubnet;
  /**
   * whether to enable the preserveClientIp
   * @default true
   */
  readonly preserveClientIp?: boolean;
  /**
   * Security groups of this endpoint
   */
  readonly securityGroup?: ec2.ISecurityGroup[];
}

export class InstanceConnectEndpoint extends Construct {
  constructor(scope: Construct, id: string, props: InstanceConnectEndpointProps) {
    super(scope, id);

    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // required policies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/permissions-for-ec2-instance-connect-endpoint.html
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ec2:CreateInstanceConnectEndpoint',
        'ec2:DeleteInstanceConnectEndpoint',
        'ec2:CreateTags',
        'ec2:CreateNetworkInterface',
      ],
      resources: [
        Stack.of(this).formatArn({
          resource: 'instance-connect-endpoint',
          service: 'ec2',
          resourceName: '*',
        }),
        Stack.of(this).formatArn({
          resource: 'network-interface',
          service: 'ec2',
          resourceName: '*',
        }),
        Stack.of(this).formatArn({
          resource: 'subnet',
          service: 'ec2',
          resourceName: '*',
        }),
        Stack.of(this).formatArn({
          resource: 'security-group',
          service: 'ec2',
          resourceName: '*',
        }),
      ],
    }));
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['ec2:DescribeInstanceConnectEndpoints'],
      resources: ['*'],
    }));
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:CreateServiceLinkedRole'],
      resources: ['*'],
    }));

    // Create an asset for the Lambda code
    const lambdaAsset = new assets.Asset(this, 'LambdaAsset', {
      path: path.join(__dirname, '../lambda.d'),
    });

    // Common properties for Lambda functions
    const commonProps = {
      runtime: lambda.Runtime.PYTHON_3_9,
      memorySize: 256,
      timeout: Duration.minutes(10),
      role,
      code: lambda.Code.fromBucket(lambdaAsset.bucket, lambdaAsset.s3ObjectKey),
    };

    const onEventHandler = new lambda.Function(this, 'onEventHandler', {
      ...commonProps,
      handler: 'index.on_event',
    });

    const isCompleteHandler = new lambda.Function(this, 'isCompleteHandler', {
      ...commonProps,
      handler: 'index.is_complete',
    });

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler,
      isCompleteHandler,
    });

    new CustomResource(this, 'EICEndpointResource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::EC2InstanceConnectEndpoint',
      properties: {
        SubnetId: props.subnet.subnetId,
        PreserveClientIp: props.preserveClientIp ?? true,
        SecurityGroup: props.securityGroup?.map(sg => sg.securityGroupId),
      },
    });
  }
}
