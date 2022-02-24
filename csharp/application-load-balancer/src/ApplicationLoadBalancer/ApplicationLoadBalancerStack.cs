using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.ElasticLoadBalancingV2;
using Amazon.CDK.AWS.AutoScaling;
using Constructs;

namespace ApplicationLoadBalancer
{
    public class ApplicationLoadBalancerStack : Stack
    {
        public ApplicationLoadBalancerStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var vpc = new Vpc(this, "VPC");

            var asg = new AutoScalingGroup(this, "ASG", new AutoScalingGroupProps{
                Vpc = vpc,
                InstanceType = InstanceType.Of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
                MachineImage = new AmazonLinuxImage()
            });

            var lb = new Amazon.CDK.AWS.ElasticLoadBalancingV2.ApplicationLoadBalancer(this, "LB", new ApplicationLoadBalancerProps{
                Vpc = vpc,
                InternetFacing = true
            });

            var listener = lb.AddListener("Listener", new BaseApplicationListenerProps{
                Port = 80
            });

            listener.AddTargets("Target", new AddApplicationTargetsProps{
                Port = 80,
                Targets = new IApplicationLoadBalancerTarget[] {asg}
            });

            listener.Connections.AllowDefaultPortFromAnyIpv4("Open to the world");

            asg.ScaleOnRequestCount("AModestLoad", new RequestCountScalingProps{
                TargetRequestsPerMinute = 60
            });
        }
    }
}
