using System;
using System.Collections.Generic;
using System.Text;
using Amazon.CDK;
using Amazon.CDK.AWS.EC2;

namespace EksClusterWithPrometheusGrafana
{
    public class VPCStack : Stack
    {
        public string VPCID { get; private set; }
        public Vpc VPC { get; private set; }

        internal VPCStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var vpc = new Vpc(this, Constants.VPC_ID, new VpcProps
            {
                Cidr = Vpc.DEFAULT_CIDR_RANGE,
                SubnetConfiguration = new[] {
                    new SubnetConfiguration{
                        Name = Constants.SUBNET_PUBLIC_ID,
                        SubnetType = SubnetType.PUBLIC
                    },
                    new SubnetConfiguration {
                        Name = Constants.SUBNET_PRIVATE_ID,
                        SubnetType = SubnetType.PRIVATE
                    }
                }
            });
            this.VPC = vpc;
            this.VPCID = vpc.VpcId;
            new CfnOutput(this, "VPCId", new CfnOutputProps
            {
                Value = this.VPCID
            });
        }
    }
}
