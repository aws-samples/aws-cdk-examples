package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awscdk.core.CfnOutput;
import software.amazon.awscdk.core.CfnOutputProps;
import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.autoscaling.*;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.patterns.*;

public class ECSNLBPatternStack extends Stack {
    public ECSNLBPatternStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSNLBPatternStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder()
        		.instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
        
        //Using ECS Patterns to instantiate a new ECS Service with cluster and image
        NetworkLoadBalancedEc2Service ecsService = new NetworkLoadBalancedEc2Service(this, "Ec2Service", NetworkLoadBalancedEc2ServiceProps.builder()
        													.cluster(cluster)
        													.memoryLimitMiB(512)
        													.taskImageOptions(NetworkLoadBalancedTaskImageOptions.builder().image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample")).build())
        													.build());
        
        new CfnOutput(this, "LoadBalancerDNS", CfnOutputProps.builder().value(ecsService.getLoadBalancer().getLoadBalancerDnsName()).build());
        
    }
}
