import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cdk = require('@aws-cdk/cdk');
import path = require('path');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'FargateServiceWithLocalImage');

// Create VPC and Fargate Cluster
// NOTE: Limit AZs to avoid reaching resource quotas
const vpc = new ec2.Vpc(stack, 'MyVpc', { maxAZs: 2 });
const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });

// Instantiate Fargate Service with a cluster and a local image that gets 
// uploaded to an S3 staging bucket prior to being uploaded to ECR.
// A new repository is created in ECR and the Fargate service is created
// with the image from ECR.
new ecs_patterns.LoadBalancedFargateService(stack, "FargateService", {
  cluster,
  image: ecs.ContainerImage.fromAsset(stack, "local-image" , { 
    directory: path.join(__dirname, 'local-image') 
  })
});

app.synth();
