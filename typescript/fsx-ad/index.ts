import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ad from 'aws-cdk-lib/aws-directoryservice';
import * as fsx from 'aws-cdk-lib/aws-fsx';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';

class AdFsxStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, adDnsDomainName: string) {
    super(app, id);

    const vpc = new ec2.Vpc(this, 'VPC', {});

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

    const dhcpOptions = new ec2.CfnDHCPOptions(this, 'dhcpOptions', {
      domainName: adDnsDomainName,
      domainNameServers: mad.attrDnsIpAddresses,
    })

    new ec2.CfnVPCDHCPOptionsAssociation(this, 'dhcpOptionsAssoc', {
      dhcpOptionsId: dhcpOptions.ref,
      vpcId: vpc.vpcId
    })
    
    const fs = new fsx.CfnFileSystem(this, 'fs', {
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
    
    const outputs = [
      {"name":"directoryAlias","value":mad.attrAlias},
      {"name":"directoryDns","value":cdk.Fn.join(',',mad.attrDnsIpAddresses)},
      {"name":"fsType", "value": fs.fileSystemType},
      {"name":"subnetIds", "value": cdk.Fn.join(',',privateSubnets)},
      {"name":"vpcId", "value":vpc.vpcId}
    ]
    
    outputs.forEach((x) => { 
      if (x.value) {
        new cdk.CfnOutput(this, x.name, {value: x.value})
      }
    })
  }
}

const app = new cdk.App();
new AdFsxStack(app, 'AdFsxStack', 'example.corp');
app.synth();
