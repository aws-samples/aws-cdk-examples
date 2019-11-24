package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.autoscaling.*;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.elasticloadbalancingv2.*;


public class LoadBalancerStack extends Stack {
    public LoadBalancerStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public LoadBalancerStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC");
        
        AutoScalingGroup asg = new AutoScalingGroup(this, "ASG", AutoScalingGroupProps.builder()
        		.instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO))
        		.machineImage(new AmazonLinuxImage())
        		.vpc(vpc)
        		.build());
        
        ApplicationLoadBalancer alb = new ApplicationLoadBalancer(this, "ALB", ApplicationLoadBalancerProps.builder()
        		.vpc(vpc)
        		.internetFacing(true)
        		.build());
        
        ApplicationListener listener = alb.addListener("Listener", BaseApplicationListenerProps.builder().port(80).build());
        
        List<IApplicationLoadBalancerTarget> asgList = new ArrayList<IApplicationLoadBalancerTarget>();
        asgList.add(asg);        

        listener.addTargets("asgTarget", AddApplicationTargetsProps.builder()
        		.targets(asgList)
        		.port(80)
        		.build());
        
        listener.getConnections().allowDefaultPortFromAnyIpv4("Open to the world");
        
        asg.scaleOnRequestCount("Load", RequestCountScalingProps.builder().targetRequestsPerSecond(1).build());
        
    }
}
