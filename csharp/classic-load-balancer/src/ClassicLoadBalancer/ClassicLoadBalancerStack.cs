using Amazon.CDK;
using Amazon.CDK.AWS.AutoScaling;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.ElasticLoadBalancing;
using Constructs;

namespace ClassicLoadBalancer
{
    public class ClassicLoadBalancerStack : Stack
    {
        public ClassicLoadBalancerStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var vpc = new Vpc(this, "VPC");

            var asg = new AutoScalingGroup(this, "ASG", new AutoScalingGroupProps
            {
                Vpc = vpc,
                InstanceType = InstanceType.Of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
                MachineImage = new AmazonLinuxImage()
            });

            var lb = new LoadBalancer(this, "LB", new LoadBalancerProps
            {
                Vpc = vpc,
                InternetFacing = true,
                HealthCheck = new Amazon.CDK.AWS.ElasticLoadBalancing.HealthCheck
                {
                    Port = 80
                }
            });

            lb.AddTarget(asg);
            var listener = lb.AddListener(new LoadBalancerListener{ExternalPort = 80});

            listener.Connections.AllowDefaultPortFromAnyIpv4("Open to the world");
        }
    }
}
