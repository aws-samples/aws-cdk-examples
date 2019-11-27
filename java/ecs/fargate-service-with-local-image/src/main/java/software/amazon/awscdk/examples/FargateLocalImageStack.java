package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.*;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.applicationautoscaling.EnableScalingProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.patterns.*;

public class FargateLocalImageStack extends Stack {
    public FargateLocalImageStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public FargateLocalImageStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "FargateCluster", ClusterProps.builder().vpc(vpc).build());
        
        new NetworkLoadBalancedFargateService(this, "FargateService", NetworkLoadBalancedFargateServiceProps.builder()
				.cluster(cluster)
				.taskImageOptions(NetworkLoadBalancedTaskImageOptions.builder()
						.image(ContainerImage.fromAsset("local-image"))
						.build())
				.build());
        
    }
}
