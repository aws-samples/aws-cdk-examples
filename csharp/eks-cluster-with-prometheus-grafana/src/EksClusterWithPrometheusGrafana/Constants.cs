using System;
using System.Collections.Generic;
using System.Text;

namespace EksClusterWithPrometheusGrafana
{
    public class Constants
    {
        public static string VPC_ID = "vpc-ew1-dev";  //<<vpc-region-env>>
        public static string SUBNET_PUBLIC_ID = "sbn-ew1-dev-dmz";    //<sbn-region-env-tier>>
        public static string SUBNET_PRIVATE_ID = "sbn-ew1-dev-app";   //<sbn-region-env-tier>>
        public static string VPC_CIDR = "10.0.0.0/16";

        public static string EKS_CLUSTER_ID = "eks-ew1-examples-dev";  //<<eks-region-application-env>>
        public static double EKS_DEFAULT_CAPACITY = 0;
        public static string EKS_CLUSTER_ADMIN_ROLE = "EKSCDKAdminRole";
        public static string EKS_INSTANCE_TYPE = "t3.large";
        public static double EKS_INSTNACE_MIN_SIZE = 2;
        public static string EKS_NODE_GROUP_ID = "ec2-ew1-examples-dev-eksnodes";  //<<ec2-region-application-env-purpose>>
        public static string EKS_NODE_ROLE_ID = "EC2CDKNodeRoleForEKS";

        public static string IAM_POLICY_EKS_CLUSTER = "AmazonEKSClusterPolicy";
        public static string IAM_POLICY_EKS_WORKER_NODE = "AmazonEKSWorkerNodePolicy";
        public static string IAM_POLICY_EC2_ECR_READONLY = "AmazonEC2ContainerRegistryReadOnly";
        public static string IAM_POLICY_EKS_CNI = "AmazonEKS_CNI_Policy";
        public static string IAM_POLICY_ACTION_ASSUMEROLE = "sts:AssumeRole";
        public static string IAM_ROLE_EC2_CONTAINERS_FULLACCESS = "AmazonEC2ContainerServiceFullAccess";
        public static string IAM_ROLE_EC2_CONTAINERS_FOR_EC2ROLE = "service-role/AmazonEC2ContainerServiceforEC2Role";
        public static string IAM_SERVICE_PRINCIPAL_EKS = "eks.amazonaws.com";
        public static string IAM_SERVICE_PRINCIPAL_EC2 = "ec2.amazonaws.com";
        public static string IAM_USER_AWSCLI_ARN = "";   // Populate this with your AWS CLI user's ARN

        public static string ECR_REPOSITORY_ID = "ecr-ew1-dev";   //<<ecr-region-env>>
        public static string ECR_REPOSITORY_NAME = "ecr-ew1-dev";

        public static string HELMCHART_REPOSITORY = "https://kubernetes-charts.storage.googleapis.com";
        public static string HELMCHART_PROMETHEUS_ID = "PrometheusChart";
        public static string HELMCHART_GRAFANA_ID = "GrafanaChart";

        public static string PROMETHEUS_HELMCHART_NAME = "prometheus";
        public static string PROMETHEUS_K8S_NAMESPACE = "prometheus";
        public static string PROMETHEUS_VOLUME_STORAGE_CLASS = "gp2";
        public static string GRAFANA_HELMCHART_NAME = "grafana";
        public static string GRAFANA_K8S_NAMESPACE = "grafana";
        public static string GRAFANA_VOLUME_STORAGE_CLASS = "gp2";
        public static string GRAFANA_DASHBOARD_ADMIN_PWD = ""; // Populate with any random password for grafana dashboard initial login
    }
}
