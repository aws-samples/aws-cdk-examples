using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.ECR;
using Amazon.CDK.AWS.EKS;
using Amazon.CDK.AWS.IAM;

namespace EksClusterWithPrometheusGrafana
{
    public class EksClusterWithPrometheusGrafanaStack : Stack
    {
        internal EksClusterWithPrometheusGrafanaStack(Construct scope, string id, Vpc vpc, string k8clusterAdminRoleArn, string k8NodeRoleArn, IStackProps props = null) : base(scope, id, props)
        {
            var eksClusterAdmin = Role.FromRoleArn(this, Constants.EKS_CLUSTER_ADMIN_ROLE, k8clusterAdminRoleArn);
            var ec2NodeRole = Role.FromRoleArn(this, Constants.EKS_NODE_ROLE_ID, k8NodeRoleArn);

            var cluster = new Cluster(this, Constants.EKS_CLUSTER_ID, new ClusterProps
            {
                ClusterName = Constants.EKS_CLUSTER_ID,
                Version = KubernetesVersion.V1_17,
                Vpc = vpc,
                VpcSubnets = new[] {
                        new SubnetSelection{
                            SubnetType = SubnetType.PRIVATE
                        }
                    },
                DefaultCapacity = Constants.EKS_DEFAULT_CAPACITY,
                MastersRole = eksClusterAdmin,
                OutputClusterName = true,
                OutputConfigCommand = true,
                OutputMastersRoleArn = true
            });

            // Deploy the latest stable chart for Prometheus using Helm.. few defaults overwritten
            var prometheusChartValues = new Dictionary<string, object>();
            prometheusChartValues.Add("alertmanager.persistentVolume.storageClass", Constants.PROMETHEUS_VOLUME_STORAGE_CLASS);
            prometheusChartValues.Add("server.persistentVolume.storageClass", Constants.PROMETHEUS_VOLUME_STORAGE_CLASS);
            cluster.AddHelmChart(Constants.HELMCHART_PROMETHEUS_ID, new HelmChartOptions
            {
                Namespace = Constants.PROMETHEUS_K8S_NAMESPACE,
                CreateNamespace = true,
                Repository = Constants.HELMCHART_REPOSITORY,
                Chart = Constants.PROMETHEUS_HELMCHART_NAME,
                Release = Constants.PROMETHEUS_HELMCHART_NAME,
                Values = prometheusChartValues,
                Wait = true,
                Timeout = Duration.Minutes(15)
            });

            // Deploy the latest stable chart for Grafana using Helm.. few defaults overwritten
            var grafanaChartValues = new Dictionary<string, object>();
            grafanaChartValues.Add("persistence.storageClassName", Constants.GRAFANA_VOLUME_STORAGE_CLASS);
            grafanaChartValues.Add("persistence.enabled", true);
            grafanaChartValues.Add("adminPassword", Constants.GRAFANA_DASHBOARD_ADMIN_PWD);
            cluster.AddHelmChart(Constants.HELMCHART_GRAFANA_ID, new HelmChartOptions
            {
                Namespace = Constants.GRAFANA_K8S_NAMESPACE,
                CreateNamespace = true,
                Repository = Constants.HELMCHART_REPOSITORY,
                Chart = Constants.GRAFANA_HELMCHART_NAME,
                Release = Constants.GRAFANA_HELMCHART_NAME,
                Values = grafanaChartValues,
                Wait = true,
                Timeout = Duration.Minutes(15)
            });

            var ec2NodeGroup = cluster.AddNodegroupCapacity(Constants.EKS_NODE_GROUP_ID, new NodegroupOptions
            {
                NodegroupName = Constants.EKS_NODE_GROUP_ID,
                InstanceType = new InstanceType(Constants.EKS_INSTANCE_TYPE),
                Subnets = new SubnetSelection
                {
                    SubnetType = SubnetType.PRIVATE
                },
                MinSize = Constants.EKS_INSTNACE_MIN_SIZE,
                NodeRole = ec2NodeRole
            });

            var repository = new Repository(this, Constants.ECR_REPOSITORY_ID, new RepositoryProps
            {
                RepositoryName = Constants.ECR_REPOSITORY_NAME,
                RemovalPolicy = RemovalPolicy.DESTROY
            });
        }
    }
}
