import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints'
// Addons implementations
import { ChaosMeshAddOn } from '../lib/chaosmesh_addon';
import { YelbNonHelmAddOn } from '../lib/yelb_non_helm_addon';

const app = new cdk.App();
const stackID = `eks-aiops`;

const clusterProvider = new blueprints.GenericClusterProvider({
    version: eks.KubernetesVersion.V1_21,
    managedNodeGroups: [
        {
            id: "mng-ondemand",
            desiredSize: 2,
            minSize: 1,
            maxSize: 4,
        },      
        
    ]
});


const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION!;

blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .clusterProvider(clusterProvider)
    .addOns(
        new blueprints.ContainerInsightsAddOn,
        new blueprints.AwsLoadBalancerControllerAddOn,
        new blueprints.MetricsServerAddOn,
        new ChaosMeshAddOn(),
        new YelbNonHelmAddOn()
    )
    .build(app, stackID);
