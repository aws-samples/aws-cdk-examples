package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.*;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.applicationautoscaling.EnableScalingProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.ecs.*;
import software.amazon.awscdk.services.ecs.patterns.*;

public class FargateAutoScalingStack extends Stack {
    public FargateAutoScalingStack(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public FargateAutoScalingStack(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);
        
        Vpc vpc = new Vpc(this, "VPC", VpcProps.builder().maxAzs(2).build());
        
        Cluster cluster = new Cluster(this, "FargateAutoScalingCluster", ClusterProps.builder().vpc(vpc).build());
        
        NetworkLoadBalancedFargateService fargateService = new NetworkLoadBalancedFargateService(this, "FargatePatternService", NetworkLoadBalancedFargateServiceProps.builder()
																.cluster(cluster)
																.taskImageOptions(NetworkLoadBalancedTaskImageOptions.builder()
																		.image(ContainerImage.fromRegistry("amazon/amazon-ecs-sample"))
																		.build())
																.build());
        
        ScalableTaskCount scaling = fargateService.getService().autoScaleTaskCount(EnableScalingProps.builder().maxCapacity(2).build());
        scaling.scaleOnCpuUtilization("CPUScaling", CpuUtilizationScalingProps.builder()
        			.targetUtilizationPercent(50)
        			.scaleInCooldown(Duration.seconds(60))
        			.scaleOutCooldown(Duration.seconds(60))
        			.build());
        
        new CfnOutput(this, "LoadBalancerDNS", CfnOutputProps.builder().value(fargateService.getLoadBalancer().getLoadBalancerDnsName()).build());
        
    }
}
