package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.*;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.Protocol;

public class ECSTaskNetworkingStack extends Stack {
    public ECSTaskNetworkingStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSTaskNetworkingStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder().instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
        
        Ec2TaskDefinition taskDefinition = new Ec2TaskDefinition(this, "Nginx-AWSVPC", Ec2TaskDefinitionProps.builder().networkMode(NetworkMode.AWS_VPC).build());
        
        ContainerDefinition container = taskDefinition.addContainer("nginx", ContainerDefinitionOptions.builder()
        									.image(ContainerImage.fromRegistry("nginx:latest"))
        									.cpu(100)
        									.memoryLimitMiB(256)
        									.essential(true)
        									.build());
        
        container.addPortMappings(PortMapping.builder().containerPort(80).protocol(Protocol.TCP).build());
        
        SecurityGroup nginxSG = new SecurityGroup(this, "NGINX--7623", SecurityGroupProps.builder().vpc(vpc).allowAllOutbound(false).build());
        
        nginxSG.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
        
        new Ec2Service(this, "ECSService", Ec2ServiceProps.builder()
        		.cluster(cluster)
        		.taskDefinition(taskDefinition)
        		.securityGroup(nginxSG)
        		.build());
        
    }
}
