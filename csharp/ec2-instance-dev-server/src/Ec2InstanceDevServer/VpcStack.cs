using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Constructs;

namespace Ec2InstanceDevServer;

public class VpcStack : NestedStack
{
    public IVpc VPC { get; }
    public CfnInstanceConnectEndpoint InstanceConnectEndpoint { get; }
    
    public VpcStack(Construct scope, string id, INestedStackProps props = null) : base(scope, id, props)
    {
        VPC = new Vpc(this, "DevServerVPC", new VpcProps
        {
            MaxAzs = 1
        });
        
        var ec2InstanceConnectEndpointSg = new SecurityGroup(this, "instanceConnectEpSg", new SecurityGroupProps
        {
            Vpc = VPC,
            AllowAllOutbound = true,
            Description = "EC2 instance connect endpoint SG"
        });
        
        InstanceConnectEndpoint = new CfnInstanceConnectEndpoint(this, "InstanceConnectEndpoint",
            new CfnInstanceConnectEndpointProps
            {
                SubnetId = VPC.PrivateSubnets[0].SubnetId,
                PreserveClientIp = true,
                SecurityGroupIds = new[]{ec2InstanceConnectEndpointSg.SecurityGroupId}
            });
    }
}