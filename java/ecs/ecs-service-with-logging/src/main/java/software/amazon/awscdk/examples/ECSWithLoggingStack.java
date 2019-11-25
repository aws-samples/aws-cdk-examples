package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awscdk.core.*;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.autoscaling.*;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.Protocol;
import software.amazon.awscdk.services.ecs.patterns.*;
import software.amazon.awscdk.services.elasticloadbalancingv2.*;
import software.amazon.awscdk.services.elasticloadbalancingv2.HealthCheck;

public class ECSWithLoggingStack extends Stack {
    public ECSWithLoggingStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSWithLoggingStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder().instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
        
        AwsLogDriver logging = new AwsLogDriver(AwsLogDriverProps.builder().streamPrefix("ECSLoggingApp").build());
        
        Ec2TaskDefinition taskDefinition = new Ec2TaskDefinition(this, "TaskDefinition");
        ContainerDefinition container = taskDefinition.addContainer("AppContainer", ContainerDefinitionOptions.builder()
        									.image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
        									.memoryLimitMiB(512)
        									.logging(logging)
        									.build());
        
        Ec2Service service = new Ec2Service(this, "ECSService", Ec2ServiceProps.builder().cluster(cluster).taskDefinition(taskDefinition).build());
                
    }
}
