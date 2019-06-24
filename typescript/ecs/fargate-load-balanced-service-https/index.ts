#!/usr/bin/env node
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cdk = require('@aws-cdk/cdk');
import acm = require('@aws-cdk/aws-certificatemanager');
import r53 = require('@aws-cdk/aws-route53');

export class FargateAlbAcmStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get inputs from context in cdk.json
    const siteDomain = this.node.tryGetContext("siteDomain");
    const dnsName = this.node.tryGetContext("dnsName");
  
    // Create new certificate
    const cert = new acm.Certificate(this, 'FargateExample', {
      domainName: dnsName + "." + siteDomain,
      validationDomains: {
        domainName: siteDomain
      }
    });

    // Create VPC and Fargate Cluster
    // NOTE: Limit AZs to avoid reaching resource quotas
    const vpc = new ec2.Vpc(this, 'MyVpc', { maxAZs: 2 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Instantiate Fargate Service with just cluster and image
    const fargateService = new ecs_patterns.LoadBalancedFargateService(this, "FargateService", {
      cluster,
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      certificate: cert
    });

    // Get the existing Route53 hosted zone that already exists
    const zone = new r53.HostedZoneProvider(this, { domainName: siteDomain }).findAndImport(this, 'Zone');

    // Create a new CNAME record and associate it to the ALB
    const dns = new r53.CnameRecord(this, 'FargateExampleDns', {
      domainName: fargateService.loadBalancer.loadBalancerDnsName,
      recordName: dnsName,
      zone
    })

    // Output the DNS where you can access your service
    new cdk.CfnOutput(this, 'FargateExampleDnsOutput', { value: dns.domainName });
  }
}


const app = new cdk.App();
new FargateAlbAcmStack(app, 'FargateAlbAcmStack');
app.synth();
