import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ad from '@aws-cdk/aws-directoryservice';
import * as fsx from '@aws-cdk/aws-fsx';
import * as sm from '@aws-cdk/aws-secretsmanager';

class AdFsxStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, adDnsDomainName: string) {
    super(app, id);

    const vpc = new ec2.Vpc(this, 'VPC');

    const privateSubnets = vpc.privateSubnets.slice(0,2).map(x => x.subnetId)

    const templatedSecret = new sm.Secret(this, adDnsDomainName + '_credentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password'
      },
    });

    const mad = new ad.CfnMicrosoftAD(this, 'ad', {
      name: adDnsDomainName,
      password: templatedSecret.secretValueFromJson('password').toString(),
      vpcSettings: {
        vpcId: vpc.vpcId,
        subnetIds: privateSubnets
      }
    })

    new fsx.CfnFileSystem(this, 'fs', {
      fileSystemType: 'WINDOWS',
      subnetIds: privateSubnets,
      storageType: 'SSD',
      storageCapacity: 32, 
      windowsConfiguration: {
        activeDirectoryId: mad.ref,
        throughputCapacity: 8,
        deploymentType: 'MULTI_AZ_1',
        preferredSubnetId: privateSubnets[0]
      }
    })

    new cdk.CfnOutput(this, 'ad-dns', {
      value: cdk.Fn.join(',', mad.attrDnsIpAddresses)
    })
  }
}

const app = new cdk.App();
new AdFsxStack(app, 'AdFsxStack', 'example.corp');
app.synth();