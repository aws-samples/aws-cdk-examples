package com.amazonaws.cdk;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.cdk.lambdalayer.kubectl.v31.KubectlV31Layer;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.eks.*;
import software.amazon.awscdk.services.iam.*;
import software.constructs.Construct;

import java.util.List;
import java.util.Objects;

public class EksFargateStack extends Stack {

    public EksFargateStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public EksFargateStack(final Construct scope, final String id, final EksFargateProps props) {
        super(scope, id, props);

        final IManagedPolicy amazonEKSClusterPolicy = ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy");
        final IManagedPolicy amazonEKSVPCResourceController = ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSVPCResourceController", "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController");

        // Role created for cluster administration
        final IRole clusterAdminRole = new Role(this, "EksClusterAdminRole", RoleProps.builder()
                .roleName("EksClusterAdminRole")
                .managedPolicies(List.of(amazonEKSClusterPolicy, amazonEKSVPCResourceController))
                .assumedBy(new ServicePrincipal("eks.amazonaws.com"))
                .build());

        // Role created for the application pods. For the sake of the least privilege principle, you can create roles for each application and associate the right permissions to them
        final IRole appRole = new Role(this, "EksClusterAppRole", RoleProps.builder()
                .roleName("EksClusterAppRole")
                .managedPolicies(List.of(amazonEKSClusterPolicy, amazonEKSVPCResourceController))
                .assumedBy(new ServicePrincipal("eks-fargate-pods.amazonaws.com"))
                .build());

        final FargateCluster eksCluster = FargateCluster.Builder.create(this, "EksFargateCluster")
                .clusterName("SampleCluster")
                .mastersRole(clusterAdminRole)
                .role(clusterAdminRole)
                .endpointAccess(EndpointAccess.PUBLIC)
                .version(KubernetesVersion.V1_31)
                .vpc(props.getVpc())
                .kubectlLayer(new KubectlV31Layer(this, "KubectlLayer"))
                .vpcSubnets(List.of(SubnetSelection.builder()
                        .subnetType(SubnetType.PRIVATE_WITH_EGRESS)
                        .build()))
                .build();

        // Fargate profile for any applications within app-* namespace. Feel free to create profiles for each application or namespace
        eksCluster.addFargateProfile("app-profile", FargateProfileOptions.builder()
                .fargateProfileName("app-profile")
                .podExecutionRole(appRole)
                .selectors(List.of(
                        Selector.builder()
                                .namespace("app-*")
                                .build()))
                .build());

        // Adding EKS add-ons
        new CfnAddon(this, "eks-vpc-cni-addon", CfnAddonProps.builder()
                .clusterName(eksCluster.getClusterName())
                .addonName("vpc-cni")
                .addonVersion("v1.19.2-eksbuild.1")
                .resolveConflicts("OVERWRITE")
                .build());

        new CfnAddon(this, "eks-kube-proxy-addon", CfnAddonProps.builder()
                .clusterName(eksCluster.getClusterName())
                .addonName("kube-proxy")
                .addonVersion("v1.31.3-eksbuild.2")
                .resolveConflicts("OVERWRITE")
                .build());

        CfnOutput.Builder.create(this, "eks-admin-role")
                .value(eksCluster.getAdminRole().getRoleArn())
                .build();

        CfnOutput.Builder.create(this, "eks-kubectl-role")
                .value(Objects.isNull(eksCluster.getKubectlRole()) ? "" : eksCluster.getKubectlRole().getRoleArn())
                .build();

    }

}
