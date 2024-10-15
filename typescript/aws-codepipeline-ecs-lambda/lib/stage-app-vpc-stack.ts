import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IpAddresses, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

export class vpcStack extends cdk.Stack {

    public readonly vpc: Vpc;
    
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
      // 👇 assign a vpc to the class property
    this.vpc = new Vpc(this, 'vpc', {
        maxAzs: 3,
        natGateways: 1,
        enableDnsHostnames: true,
        enableDnsSupport: true,
        ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
        subnetConfiguration: [
        {
            cidrMask: 24,
            name: 'public',
            subnetType: SubnetType.PUBLIC,
        },
        {
            cidrMask: 24,
            name: 'private',
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
            cidrMask: 28,
            name: 'ioslated',
            subnetType: SubnetType.PRIVATE_ISOLATED,
        }]
    })
    }
}
