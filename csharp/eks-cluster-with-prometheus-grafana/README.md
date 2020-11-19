# Provisioning EKS Cluster with Prometheus and Grafana using CDK

This project contains example code for provisioning EKS cluster and deploy Prometheus and Grafana for monitoring using the AWS CDK libraries.
The project also contains multiple stacks like separate stacks for provisioning IAM roles, VPC and the EKS cluster. The dependencies between the stacks are added appropriately such that the stacks are created/destroyed in the proper order.

## Pre-requisites

Provisioning the EKS clusters uses assets, so your CDK environment needs to have been bootstrapped before you deploy this stack. Please run `cdk bootstrap` command to prepare you environment. More details can be found in https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html
Also in `Constants.cs` file, update appropriate vailes for below two lines.

```
public static string IAM_USER_AWSCLI_ARN = "";   // Populate this with your AWS CLI user's ARN
public static string GRAFANA_DASHBOARD_ADMIN_PWD = ""; // Populate with any random password for grafana dashboard initial login
```

## Deploying the stack

You can run below command to deploy all the stacks in this project together. It takes approximately 30 minutes to complete the deployment.
`cdk deploy "*Stack"`

## Verifying the deployment

The EKS cluster deployment logs will output kube config command which can be executed to update your local kubeconfig file. You can also find this command under the CloudFormation stack output panel. Then command will be like below.
`aws2 eks update-kubeconfig --name <CLUSTER_NAME> --region <REGION_NAME> --role-arn <CLUSTER_ADMIN_ROLE_ARN>`

You can run below kubectl commands to verify the cluster and also the Prometheus and Grafana deployments

```
D:\Workspaces>kubectl get nodes
NAME                                         STATUS   ROLES    AGE     VERSION
ip-10-0-133-159.eu-west-1.compute.internal   Ready    <none>   9m43s   v1.17.11-eks-cfdc40
ip-10-0-246-146.eu-west-1.compute.internal   Ready    <none>   9m42s   v1.17.11-eks-cfdc40

D:\Workspaces>kubectl get namespace
NAME              STATUS   AGE
default           Active   14m
grafana           Active   5m9s
kube-node-lease   Active   14m
kube-public       Active   14m
kube-system       Active   14m
prometheus        Active   5m9s

D:\Workspaces>kubectl get all -n prometheus
NAME                                                 READY   STATUS    RESTARTS   AGE
pod/prometheus-alertmanager-6c97954dd7-65p82         2/2     Running   0          5m19s
pod/prometheus-kube-state-metrics-6df5d44568-g7lmb   1/1     Running   0          5m19s
pod/prometheus-node-exporter-h4b5x                   1/1     Running   0          5m19s
pod/prometheus-node-exporter-qvbr9                   1/1     Running   0          5m19s
pod/prometheus-pushgateway-7848796cf-4wxr7           1/1     Running   0          5m19s
pod/prometheus-server-57c4bc5b9d-m2tg8               2/2     Running   0          5m19s

NAME                                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/prometheus-alertmanager         ClusterIP   172.20.80.3      <none>        80/TCP     5m19s
service/prometheus-kube-state-metrics   ClusterIP   172.20.104.8     <none>        8080/TCP   5m19s
service/prometheus-node-exporter        ClusterIP   None             <none>        9100/TCP   5m19s
service/prometheus-pushgateway          ClusterIP   172.20.152.228   <none>        9091/TCP   5m19s
service/prometheus-server               ClusterIP   172.20.250.94    <none>        80/TCP     5m19s

NAME                                      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/prometheus-node-exporter   2         2         2       2            2           <none>          5m19s

NAME                                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/prometheus-alertmanager         1/1     1            1           5m20s
deployment.apps/prometheus-kube-state-metrics   1/1     1            1           5m20s
deployment.apps/prometheus-pushgateway          1/1     1            1           5m20s
deployment.apps/prometheus-server               1/1     1            1           5m20s

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/prometheus-alertmanager-6c97954dd7         1         1         1       5m20s
replicaset.apps/prometheus-kube-state-metrics-6df5d44568   1         1         1       5m20s
replicaset.apps/prometheus-pushgateway-7848796cf           1         1         1       5m20s
replicaset.apps/prometheus-server-57c4bc5b9d               1         1         1       5m20s

D:\Workspaces>kubectl get all -n grafana
NAME                          READY   STATUS    RESTARTS   AGE
pod/grafana-5fc5d4dc7-b8gmg   1/1     Running   0          5m46s

NAME              TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
service/grafana   ClusterIP   172.20.172.222   <none>        80/TCP    5m47s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/grafana   1/1     1            1           5m47s

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/grafana-5fc5d4dc7   1         1         1       5m47s
```

## Verifying Prometheus

The Prometheus deployment creates the services as ClusterIP by default unless we specifically configured the properties otherwise. So you can run below command to port forward and access the Prometheus web console.
`kubectl port-forward -n prometheus deploy/prometheus-server 8080:9090`

![Prometheus Web Console](img/prometheus-web.png?raw=true "Prometheus Web Console")

## Verifying Grafana

The Grafana deployment creates the services as ClusterIP by default unless we specifically configured the properties otherwise. So you can run below command to port forward and access the Grafana web console. You need to login with the password you setup in the pre-requisite step.
`kubectl port-forward -n grafana deploy/grafana 8080:3000`

![Grafana Web Console](img/grafana-web.png?raw=true "Grafana Web Console")

## Configuring Grafana dashboards

The Grafana UI does not have any datasource added by default. This can be configured like below by providing the URL as `http://prometheus-server.prometheus.svc.cluster.local`

![Grafana Datasource Setup](img/grafana-datasource-setup.png?raw=true "Grafana Datasource Setup")

Once the datasource is added and verified as working then the dasboards can be configured either manually or by importing some public dashboards like below. Detailed steps for configuring these dashboards can also be found in https://www.eksworkshop.com/intermediate/240_monitoring/dashboards/

![Importing Grafana Dashboard](img/grafana-dashboard-import.png?raw=true "Importing Grafana Dashboard")

![Grafana Dashboard for Kubernetes cluster monitoring](img/grafana-dashboard-3119.png?raw=true "Grafana Dashboard for Kubernetes cluster monitoring")

![Grafana Dashboard for Kubernetes POD monitoring](img/grafana-dashboard-6417.png?raw=true "Grafana Dashboard for Kubernetes POD monitoring")

## Destroying the stack

You can run below command to destroy all the stacks in this project together.
`cdk destroy "*Stack"`
