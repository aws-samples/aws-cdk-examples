package software.amazon.awscdk.samples;

import java.util.Arrays;

import software.amazon.awscdk.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroupProps;
import software.amazon.awscdk.services.autoscaling.RequestCountScalingProps;
import software.amazon.awscdk.services.ec2.AmazonLinuxImage;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceTypePair;
import software.amazon.awscdk.services.ec2.VpcNetwork;
import software.amazon.awscdk.services.elasticloadbalancingv2.AddApplicationTargetsProps;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationListener;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancer;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancerProps;
import software.amazon.awscdk.services.elasticloadbalancingv2.BaseApplicationListenerProps;

public class ApplicationLoadBalancerStack extends Stack {
    public ApplicationLoadBalancerStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ApplicationLoadBalancerStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);

        final VpcNetwork vpc = new VpcNetwork(this, "VPC");
        final AutoScalingGroup asg = new AutoScalingGroup(this,
                                                          "ASG",
                                                          AutoScalingGroupProps.builder()
                                                                               .withVpc(vpc)
                                                                               .withInstanceType(new InstanceTypePair(InstanceClass.Burstable2,
                                                                                                                      InstanceSize.Micro))
                                                                               .withMachineImage(new AmazonLinuxImage())
                                                                               .build());
        final ApplicationLoadBalancer lb = new ApplicationLoadBalancer(this,
                                                                       "LB",
                                                                       ApplicationLoadBalancerProps.builder()
                                                                                                   .withVpc(vpc)
                                                                                                   .withInternetFacing(true)
                                                                                                   .build());
        final ApplicationListener listener = lb.addListener("Listener",
                                                            BaseApplicationListenerProps.builder()
                                                                                        .withPort(80)
                                                                                        .build());
        listener.addTargets("Target",
                            AddApplicationTargetsProps.builder()
                                                      .withPort(80)
                                                      .withTargets(Arrays.asList(asg))
                                                      .build());
        listener.getConnections().allowDefaultPortFromAnyIpv4("Open to the world");
        asg.scaleOnRequestCount("AModestLoad", RequestCountScalingProps.builder().withTargetRequestsPerSecond(1).build());
    }
}
