import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import cdk = require('@aws-cdk/core');

interface SharedALBFargateServiceProps extends cdk.StackProps {
  loadBalancerSecurityGroupId: string;
  vpcId: string;
  clusterName: string;
  loadBalancerArn: string;
  listenerArn: string;
  peerServiceSecurityGroups?: string[];
}

class SharedALBFargateService extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: SharedALBFargateServiceProps) {
    super(scope, id, props);

    // take care of importing all required constructs 
    const vpc = ec2.Vpc.fromLookup(this, "vpc", {vpcId: props.vpcId});
    const lbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, "sgId", props.loadBalancerSecurityGroupId);
    const securityGroups = props.peerServiceSecurityGroups === undefined ? [] : 
      props.peerServiceSecurityGroups.map((x) => {return ec2.SecurityGroup.fromSecurityGroupId(this, "imported-"+x, x)});
    const importedCluster = ecs.Cluster.fromClusterAttributes(this, "clusterImport", {
      clusterName: props.clusterName,
      vpc,
      securityGroups,
    });
    const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, "Listener", {
      listenerArn: props.listenerArn,
      securityGroup: lbSecurityGroup,
    });
    const alb = elbv2.ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(this, "loadBalancer", {
      loadBalancerArn: props.loadBalancerArn,
      securityGroupId: props.loadBalancerSecurityGroupId, 
      securityGroupAllowsAllOutbound: false,
    });

    // create our task definition, container, and add port mappings
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TD2");
    const container = taskDefinition.addContainer("Service2Container", {
      image: ecs.ContainerImage.fromRegistry("nginx"),
      environment: {"MY_ENVIRONMENT_VAR": "FOO"},
      memoryLimitMiB: 512,
      cpu: 256,
    });
    container.addPortMappings({containerPort: 80})

    // Create a service -- this instance isn't particularly complex, since we only have
    // one container image per service that we need to worry about. 
    // We'll reuse the cluster from our first service but use our newly created 
    // security group for this purpose. 
    const service2 = new ecs.FargateService(this, "service2", {
      cluster: importedCluster,
      taskDefinition
    });

    // Set up security group ingress/egress between LB and new service
    service2.connections.allowFrom(alb, ec2.Port.tcp(80));
    alb.connections.allowTo(service2, ec2.Port.tcp(80));
    // Allow connections between services if necessary. This would require importing
    // any other service by attributes and ensuring that you specify its security group when
    // importing the cluster. 

    // Create a new target group for the service and add it to the listener, specifying
    // a path, host, or IP pattern and a priority. 
    const tg = new elbv2.ApplicationTargetGroup(this, "targetgroup", {
      targets: [service2],
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc,
    });
    listener.addTargetGroups("targetgroup", {
      targetGroups: [tg],
      pathPattern: "/app2/*",
      priority: 100
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {value: alb.loadBalancerDnsName})
  }
}

const app = new cdk.App();

const props = {
  loadBalancerSecurityGroupId: 'my-lb-sg-id',
  vpcId: 'my-vpc-id',
  clusterName: 'my-cluster-name',
  loadBalancerArn: 'my-load-balancer-arn',
  listenerArn: 'my-listener-arn',
  peerServiceSecurityGroups: [],  
}

new SharedALBFargateService(app, 'fargate-service-with-imported-application-load-balancer', props);

app.synth()
