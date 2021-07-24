# WAF - Web Application Firewall

<!--BEGIN STABILITY BANNER-->

---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem

---
<!--END STABILITY BANNER-->

* Creates a **WAF** for use with **CloudFront** and a **WAF** for use with **Load Balancers**.
* Both WAF stacks are virtually identical:
  * `waf_cloudfront.py`
  * `waf_regional.py`
* Each stack is customized for the target usage scenario.

## Install CDK

* **cdk** is a **NodeJS** app.
* Install NodeJS.
* Use `npm` to install `cdk`

```bash
npm install -g cdk
```

### Create Python Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Install Python-specific modules

* Each service such as **wafv2** _(`aws_cdk.aws_wafv2`)_ or **ec2** _(`aws_cdk.aws_ec2`)_, has its own module which must be defined in `requirements.txt`.

```bash
pip3 install -r requirements.txt
```

## Build the Cloudformation from CDK

To build this example, you need to be in this example's root directory. Then run the following:

```bash
cdk synth
```

* This will build the CloudFormation template. The resulting CloudFormation template will be in the `cdk.out` directory.
* If you want to see the `yaml` formatted CDK for a Stack, pass it as a name to the `cdk synth` command:

```bash
cdk synth WafCloudFrontStack
cdk synth WafRegionalStack
```

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment, you will be able to assign the WAF to the CloudFront or Load Balancer resources.

## WAF Rules

* The WAF leverages the AWS Managed rules for most of the enabled rule list.
* The list of available ruls can be quickly found using the AWS CLI:

```bash
aws wafv2 list-available-managed-rule-groups --scope CLOUDFRONT
aws wafv2 list-available-managed-rule-groups --scope REGIONAL
```

### Restrict connections based on country code

* The example code includes a rule based on the geographic region of the source IP.
* If the IP is outside the list of country codes, then the IP will be blocked.

### Restrict connections based on flow

* The example code includes a rule that will restrict connections based on flow rate.
* In the included example, if the connection count is higher than 100 in a 5 minute period, the connection will be blocked.

## Using the WAF in other stacks and assigning to resources

* Each WAF stack produces a **CloudFormation Export**.
* The CloudFormation Export records the WAF ARN for use with other stacks:
* The exports are named:
  * `WafCloudFrontStack:WafAclCloudFrontArn`
  * `WafRegionalStack:WafAclRegionalArn`

### Assign WAF to CloudFront Distribution

```python
from aws_cdk import (
  core,
  aws_wafv2      as wafv2,
  aws_cloudfront as cloudfront,
)

wafacl_cloudfront_arn = core.Fn.import_value("WafCloudFrontStack:WafAclCloudFrontArn");

cloudfront.CloudFrontWebDistribution(self, 'frontendDistribution', {
  ..
  ..
  ..
  web_acl_id: wafacl_cloudfront_arn
});
```

### Assign WAF to AppSync GraphQL API

```python
from aws_cdk import (
  core,
  aws_wafv2   as wafv2,
  aws_appsync as appsync,
)

wafacl_appsync_arn    = core.Fn.import_value("WafRegionalStack:WafAclAppSyncArn");

gql = appsync.GraphqlApi(self, 'NeptuneGraphQLApi',
  ...
  ...
  ...
);

wafv2.CfnWebACLAssociation(self, 'NeptuneGraphQLApiWaf',
  resourceArn: gql.arn,
  webAclArn:   wafacl_appsync_arn
)
```
