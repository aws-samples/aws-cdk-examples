import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class R53ResolverVPC extends Construct {
  public vpc: ec2.Vpc;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
    this.vpc = new ec2.Vpc(this, "R53ResolverTestVPC", {
      ipAddresses: ec2.IpAddresses.cidr("10.24.34.0/23"),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      maxAzs: 2,
    });
  }
}
