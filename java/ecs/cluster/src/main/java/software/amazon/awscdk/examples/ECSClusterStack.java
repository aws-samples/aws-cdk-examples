package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.autoscaling.*;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;


public class ECSClusterStack extends Stack {
    public ECSClusterStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSClusterStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        AutoScalingGroup asg = new AutoScalingGroup(this, "MyFleet", AutoScalingGroupProps.builder()
        		.instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.XLARGE))
        		.machineImage(new EcsOptimizedAmi())
        		.desiredCapacity(3)
        		.updateType(UpdateType.REPLACING_UPDATE)
        		.vpc(vpc)
        		.build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addAutoScalingGroup(asg);
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder()
        		.instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
                
    }
}
