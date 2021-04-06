using System.IO;
using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.ECS;
using Amazon.CDK.AWS.ECS.Patterns;

namespace Cdk
{
    public class CdkStack : Stack
    {
        internal CdkStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var vpc = new Vpc(this, "DotNetGravitonVpc", new VpcProps
            {
                MaxAzs = 2
            });

            var cluster = new Cluster(this, "DotNetGravitonCluster", new ClusterProps
            {
                Vpc = vpc
            });

            cluster.AddCapacity("DefaultAutoScalingGroupCapacity",
                new AddCapacityOptions
                {
                    InstanceType = new InstanceType("c6g.4xlarge"),
                    MachineImage = EcsOptimizedImage.AmazonLinux2(AmiHardwareType.ARM)
                }
            );

            new ApplicationLoadBalancedEc2Service(this, "Service",
                new ApplicationLoadBalancedEc2ServiceProps
                {
                    Cluster = cluster,
                    MemoryLimitMiB = 8192,
                    DesiredCount = 2,
                    TaskImageOptions = new ApplicationLoadBalancedTaskImageOptions
                    {
                        Image =  ContainerImage.FromAsset(Path.Combine(Directory.GetCurrentDirectory(), @"../app")),                        
                    }                             
                }
            );
        }
    }
}
