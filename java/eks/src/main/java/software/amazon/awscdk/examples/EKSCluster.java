package software.amazon.awscdk.examples;


import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.autoscaling.UpdatePolicy;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.eks.*;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.constructs.Construct;

/**
 * Hello world!
 *
 */
public class EKSCluster extends Stack {


  public EKSCluster(final Construct parent, final String name) {
    super(parent, name);

    new EKSClusterConstruct(this,"testS3");
  }
  static class EKSClusterConstruct extends Construct {
    EKSClusterConstruct(
      final Construct parent, final String name) {
      super(parent, name);

      // create vpc
      Vpc vpc = Vpc.Builder.create(this,"EKSVpc").build();

      // IAM role for our EC2 worker nodes
      Role workerRole = Role.Builder.create(this,"EKSWorkerRole")
        .roleName("EKSWorkerRole")
        .assumedBy(new ServicePrincipal("ec2.amazonaws.com")).build();

      Cluster eksCluster = Cluster.Builder.create(this,"Cluster")
        .vpc(vpc).defaultCapacity(0) // we want to manage capacity our selves
        .version(KubernetesVersion.V1_21).build();

      AutoScalingGroup onDemandASG = AutoScalingGroup.Builder.create(this,"OnDemandASG")
        .vpc(vpc).role(workerRole).minCapacity(1).maxCapacity(10)
        .instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MEDIUM))
        .machineImage(EksOptimizedImage.Builder.create().kubernetesVersion("1.21").nodeType(NodeType.STANDARD).build())
        .updatePolicy(UpdatePolicy.rollingUpdate()).build();

      eksCluster.connectAutoScalingGroupCapacity(onDemandASG, AutoScalingGroupOptions.builder().build());

    }
  }
}
