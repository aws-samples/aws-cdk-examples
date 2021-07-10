WAF - Web Application Firewall
==========================

* Creates a **WAF** for with with **CloudFront** and a **WAF** for use with **Load Balancers**.


## Build

To build this example, you need to be in this example's root directory. Then run the following:

```bash
npm install -g aws-cdk
npm install
cdk synth
```

* This will install the necessary CDK, then this example's dependencies, and then build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.
* If you want to see the `yaml` formatted CDK for a Stack, pass it as a name to the `cdk synth` command:

```bash
cdk synth WafCloudFrontStack
cdk synth WafRegionalStack
```

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment, you will be able to assign the WAF to the CloudFront or Load Balancer resources.




