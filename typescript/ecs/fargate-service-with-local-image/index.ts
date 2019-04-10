import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');
import path = require('path');

class FargateServiceWithLocalImage extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC and Fargate Cluster
    // NOTE: Limit AZs to avoid reaching resource quotas
    const vpc = new ec2.VpcNetwork(this, 'MyVpc', { maxAZs: 2 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Instantiate Fargate Service with a cluster and a local image that gets 
    // uploaded to an S3 staging bucket prior to being uploaded to ECR.
    // A new repository is created in ECR and the Fargate service is created
    // with the image from ECR.
    const fargateService = new ecs.LoadBalancedFargateService(this, "FargateService", {
      cluster,
      image: ecs.ContainerImage.fromAsset(this, "local-image" , { 
        directory: path.join(__dirname, 'local-image') 
      })
    });

    // Output the DNS where you can access your service
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.dnsName });
  }
}

const app = new cdk.App();

new FargateServiceWithLocalImage(app, 'FargateServiceWithLocalImage');

app.run();
