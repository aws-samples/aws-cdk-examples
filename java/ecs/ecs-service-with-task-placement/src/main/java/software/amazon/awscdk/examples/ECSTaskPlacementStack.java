package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awscdk.core.*;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.Protocol;

public class ECSTaskPlacementStack extends Stack {
    public ECSTaskPlacementStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSTaskPlacementStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder().instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
        
        // Adding Placement Constraints in the Service instead of the Task Definition. 
        //List<PlacementConstraint> plc = new ArrayList<PlacementConstraint>();
        //plc.add(PlacementConstraint.distinctInstances());
        
        Ec2TaskDefinition taskDefinition = new Ec2TaskDefinition(this, "TaskDefn", Ec2TaskDefinitionProps.builder().build());
        											//.placementConstraints(plc)
        											
        
        ContainerDefinition container = taskDefinition.addContainer("web", ContainerDefinitionOptions.builder()
        									.image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
        									.memoryLimitMiB(256)
        									.build());
        
        container.addPortMappings(PortMapping.builder().containerPort(80).hostPort(8080).protocol(Protocol.TCP).build());
        
        
        Ec2Service service = new Ec2Service(this, "ECSService", Ec2ServiceProps.builder()
        		.cluster(cluster)
        		.taskDefinition(taskDefinition)
        		.build());
        
        service.addPlacementConstraints(PlacementConstraint.distinctInstances());
        service.addPlacementStrategies(PlacementStrategy.packedBy(BinPackResource.MEMORY), PlacementStrategy.spreadAcross(BuiltInAttributes.AVAILABILITY_ZONE));
    }
}
