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

public class ECSAdvancedALBStack extends Stack {
    public ECSAdvancedALBStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public ECSAdvancedALBStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        cluster.addCapacity("DefaultAutoScalingGroup", AddCapacityOptions.builder().instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO)).build());
        
        Ec2TaskDefinition taskDefinition = new Ec2TaskDefinition(this, "TaskDefinition");
        ContainerDefinition container = taskDefinition.addContainer("web", ContainerDefinitionOptions.builder()
        									.image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
        									.memoryLimitMiB(256)
        									.build());
        
        container.addPortMappings(PortMapping.builder().containerPort(80).hostPort(8080).protocol(Protocol.TCP).build());
        
        Ec2Service service = new Ec2Service(this, "ECSService", Ec2ServiceProps.builder().cluster(cluster).taskDefinition(taskDefinition).build());
        
        ApplicationLoadBalancer alb = new ApplicationLoadBalancer(this, "ALB", ApplicationLoadBalancerProps.builder()
        									.vpc(vpc)
        									.internetFacing(true)
        									.build());
        
        ApplicationListener listener = alb.addListener("PublicListener", BaseApplicationListenerProps.builder().port(80).build());
        
        List<IApplicationLoadBalancerTarget> targetList = new ArrayList<IApplicationLoadBalancerTarget>();
        targetList.add(service.loadBalancerTarget(LoadBalancerTargetOptions.builder().containerName("web").containerPort(80).build()));        

        listener.addTargets("ECSTarget", AddApplicationTargetsProps.builder()
        			.port(80)
        			.targets(targetList)
        			.healthCheck(HealthCheck.builder().interval(Duration.seconds(60)).timeout(Duration.seconds(5)).path("/health").build())
        			.build());
        
        new CfnOutput(this, "LoadBalancerDNS", CfnOutputProps.builder().value(alb.getLoadBalancerDnsName()).build());
        
    }
}
