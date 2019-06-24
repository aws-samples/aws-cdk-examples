# Fargate service load balanced behind an ALB using Route 53 for DNS with ACM for HTTPs certificate

This stack builds on the [fargate-load-balanced-service](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/ecs/fargate-load-balanced-service), but creates a DNS entry in a Route 53 hosted zone that you specify. It also creates an SSL certificate using ACM under the same domain. Note: The CloudFormation stack deployment will wait until you approve the request for the certificate via ACM

## Inputs

You'll need to specify the domain name (to be used for the Route 53 hosted zone), as well as the hostname (for the CNAME to be created in Route 53 to point to the ALB of the Fargate service) in the context located in [cdk.json](cdk.json):

```
{
  "app": "node index",
  "context": {
    "siteDomain": "example.com",
    "dnsName": "example-service"
  }
}
```

## To deploy

Once you've updated the context, run the following in the same directory as this code:

```
$ npm install
$ npm run build
$ cdk deploy

# Afterwards
$ cdk destroy
```

Please know that the CloudFormation deployment will wait until you approve the request for the ACM SSL certificate. By default, ACM will request approvals via email to the owner of the domain that you specify. Once you approve these requests, the deployment will progress.
