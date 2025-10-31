import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cr from 'aws-cdk-lib/custom-resources';

export class IotCoreBasicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create IoT Thing
    const thing = new iot.CfnThing(this, 'DemoDevice', {
      thingName: 'DemoDevice',
      attributePayload: {
        attributes: {
          deviceType: 'sensor',
          location: 'warehouse-1'
        }
      }
    });

    // Create X.509 Certificate using Custom Resource
    const createCertificate = new cr.AwsCustomResource(this, 'CreateIoTCertificate', {
      onCreate: {
        service: 'Iot',
        action: 'createKeysAndCertificate',
        parameters: {
          setAsActive: true
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('certificateId')
      },
      onDelete: {
        service: 'Iot',
        action: 'updateCertificate',
        parameters: {
          certificateId: new cr.PhysicalResourceIdReference(),
          newStatus: 'INACTIVE'
        }
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'iot:CreateKeysAndCertificate',
            'iot:UpdateCertificate',
            'iot:DeleteCertificate'
          ],
          resources: ['*']
        })
      ])
    });

    // Extract certificate details
    const certificateArn = createCertificate.getResponseField('certificateArn');
    const certificatePem = createCertificate.getResponseField('certificatePem');
    const privateKey = createCertificate.getResponseField('keyPair.PrivateKey');

    // Store certificate and private key in Secrets Manager
    const certificateSecret = new secretsmanager.Secret(this, 'CertificateSecret', {
      secretName: 'iot-device-certificate',
      description: 'IoT Device Certificate PEM',
      secretStringValue: cdk.SecretValue.unsafePlainText(certificatePem)
    });

    const privateKeySecret = new secretsmanager.Secret(this, 'PrivateKeySecret', {
      secretName: 'iot-device-private-key',
      description: 'IoT Device Private Key',
      secretStringValue: cdk.SecretValue.unsafePlainText(privateKey)
    });

    // Create IoT Policy
    const policy = new iot.CfnPolicy(this, 'DevicePolicy', {
      policyName: 'DemoDevicePolicy',
      policyDocument: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['iot:Connect'],
            resources: [
              `arn:aws:iot:${this.region}:${this.account}:client/\${iot:Connection.Thing.ThingName}`
            ],
            effect: iam.Effect.ALLOW
          }),
          new iam.PolicyStatement({
            actions: ['iot:Publish'],
            resources: [
              `arn:aws:iot:${this.region}:${this.account}:topic/device/data`
            ],
            effect: iam.Effect.ALLOW
          })
        ]
      })
    });

    // Attach policy to certificate
    const policyAttachment = new iot.CfnPolicyPrincipalAttachment(this, 'PolicyAttachment', {
      policyName: policy.policyName!,
      principal: certificateArn
    });
    policyAttachment.addDependency(policy);
    policyAttachment.node.addDependency(createCertificate);

    // Attach certificate to thing
    const thingAttachment = new iot.CfnThingPrincipalAttachment(this, 'ThingAttachment', {
      thingName: thing.thingName!,
      principal: certificateArn
    });
    thingAttachment.addDependency(thing);
    thingAttachment.node.addDependency(createCertificate);

    // Create Kinesis Data Stream
    const dataStream = new kinesis.Stream(this, 'IoTDataStream', {
      streamName: 'IoTDataStream',
      shardCount: 1
    });

    // Create IAM role for IoT Rule
    const iotRuleRole = new iam.Role(this, 'IoTRuleRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
    });

    dataStream.grantWrite(iotRuleRole);

    // Create IoT Rule
    new iot.CfnTopicRule(this, 'DataStreamRule', {
      topicRulePayload: {
        sql: "SELECT * FROM 'device/data'",
        actions: [
          {
            kinesis: {
              streamName: dataStream.streamName,
              roleArn: iotRuleRole.roleArn,
              partitionKey: '${timestamp()}'
            }
          }
        ]
      }
    });

    // Outputs
    new cdk.CfnOutput(this, 'ThingName', {
      value: thing.thingName!
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificateArn
    });

    new cdk.CfnOutput(this, 'CertificateSecretArn', {
      value: certificateSecret.secretArn
    });

    new cdk.CfnOutput(this, 'PrivateKeySecretArn', {
      value: privateKeySecret.secretArn
    });
  }
}
