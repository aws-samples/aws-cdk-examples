import * as ec2 from "@aws-cdk/aws-ec2"
import * as cdk from "@aws-cdk/core"

export class EC2InstanceStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps ){
        super(scope, id, props);
        
        // VPC
        new ec2.Vpc(this, 'VPC', {
          cidr: "10.0.0.0/16"
        });

        // AMI
        let amiLinux = ec2.MachineImage.latestAmazonLinux(
            {
                generation : ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                edition :  ec2.AmazonLinuxEdition.STANDARD,
                virtualization : ec2.AmazonLinuxVirt.HVM,
                storage : ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
            }
        );
        
        // Ec2 instance with vpc and amiLinux AMI
        let instance = new ec2.Instance(this, id, 
            {
               instanceType : new ec2.InstanceType("t3.nano"),
                machineImage : amiLinux,
                vpc         : vpc
            });

    }
}
