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

public class FargateWithLoggingStack extends Stack {
    public FargateWithLoggingStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public FargateWithLoggingStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "ECSCluster", ClusterProps.builder().vpc(vpc).build());
        
        AwsLogDriver logging = new AwsLogDriver(AwsLogDriverProps.builder().streamPrefix("FargateApp").build());
        
        FargateTaskDefinition taskDefinition = new FargateTaskDefinition(this, "FargateTaskDefinition", FargateTaskDefinitionProps.builder()
        												.memoryLimitMiB(512)
        												.cpu(256)
        												.build());
        
        ContainerDefinition container = taskDefinition.addContainer("AppContainer", ContainerDefinitionOptions.builder()
        									.image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
        									.logging(logging)
        									.build());
        
        FargateService service = new FargateService(this, "FargateService", FargateServiceProps.builder()
        							.cluster(cluster)
        							.taskDefinition(taskDefinition)
        							.build());
                
    }
}
