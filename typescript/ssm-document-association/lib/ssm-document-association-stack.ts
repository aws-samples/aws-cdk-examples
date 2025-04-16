import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SsmDocumentAssociationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an SSM Document that writes current time to a new file
    const ssmDocument = new ssm.CfnDocument(this, 'TimeWriterDocument', {
      name: 'WriteTimeToFile',
      documentType: 'Command',
      content: {
        schemaVersion: '2.2',
        description: 'Write current timestamp to a new file',
        parameters: {
          DirectoryPath: {
            type: 'String',
            description: 'Directory where the time files will be written',
            default: '/tmp/time_logs'
          }
        },
        mainSteps: [
          {
            action: 'aws:runShellScript',
            name: 'writeTimeToNewFile',
            inputs: {
              runCommand: [
                'mkdir -p {{DirectoryPath}}',
                'TIMESTAMP=$(date +"%Y%m%d_%H%M%S")',
                'FILENAME="time_$TIMESTAMP.txt"',
                'FILEPATH="{{DirectoryPath}}/$FILENAME"',
                'echo "Creating new time file: $FILEPATH"',
                'date > $FILEPATH',
                'echo "Current time written to $FILEPATH: $(cat $FILEPATH)"',
                'echo "Total files in directory: $(ls -1 {{DirectoryPath}} | wc -l)"',
                'echo "Operation completed on $(hostname)"'
              ]
            }
          }
        ]
      }
    });

    // Create an association for the document
    // Apply the document to all EC2 instances with the tag Environment:Development
    // The association will run every 30 minutes
    new ssm.CfnAssociation(this, 'DocumentAssociation', {
      name: ssmDocument.ref,
      targets: [
        {
          key: 'tag:Environment',
          values: ['Development']
        }
      ],
      parameters: {
        // overwrite default parameter
        'DirectoryPath': ['/opt/aws/time_records']
      },
      scheduleExpression: 'rate(30 minutes)'
    });


    // Testing infrastructure
    // A VPC + EC2 + Connect using AWS Session Manager
    // No NAT / Private Subnets
    const vpc = new ec2.Vpc(this, 'SSMDocumentTestVpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    const role = new iam.Role(this, 'EC2SSMRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      ]
    });

    // Create an EC2 instance with Environment tag set to Development
    // Use AMI that contains SSM agent
    const instance = new ec2.Instance(this, 'SSMTestInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Add the Environment:Development tag that matches our SSM Document association
    cdk.Tags.of(instance).add('Environment', 'Development');

    // Outputs
    new cdk.CfnOutput(this, 'DocumentName', {
      value: ssmDocument.ref,
      description: 'The name of the SSM document'
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'The ID of the test EC2 instance'
    });
  }
}
