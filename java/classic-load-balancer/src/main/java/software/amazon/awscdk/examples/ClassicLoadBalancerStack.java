package software.amazon.awscdk.examples;

import software.constructs.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.ec2.AmazonLinuxImage;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.elasticloadbalancing.LoadBalancer;
import software.amazon.awscdk.services.elasticloadbalancing.HealthCheck;
import software.amazon.awscdk.services.elasticloadbalancing.LoadBalancerListener;
import software.amazon.awscdk.services.elasticloadbalancing.ListenerPort;


/**
 * Classic Load balance CDK example for Java!
 */
class ClassicLoadBalancerStack extends Stack {
    public ClassicLoadBalancerStack(final Construct parent, final String name) {

        super(parent, name, null);
    }

    public ClassicLoadBalancerStack(final Construct parent, final String name, final StackProps props) {

        super(parent, name, props);

        Vpc vpc = new Vpc(this, "VPC");

        AutoScalingGroup asg = AutoScalingGroup.Builder.create(this,"ASG")
                .vpc(vpc)
                .instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO))
                .machineImage(new AmazonLinuxImage())
                .build();
        HealthCheck.Builder  healthCheckBuilder = new HealthCheck.Builder();
        HealthCheck healthCheck = healthCheckBuilder.port(80).build();
        LoadBalancer lb = LoadBalancer.Builder.create(this,"LB")
                .vpc(vpc)
                .internetFacing(Boolean.TRUE)
                .healthCheck(healthCheck)
                .build();
        lb.addTarget(asg);
        ListenerPort listenerPort = lb.addListener(LoadBalancerListener.builder().externalPort(80).build());
        listenerPort.getConnections().allowDefaultPortFromAnyIpv4("Open to the world");

    }
}
