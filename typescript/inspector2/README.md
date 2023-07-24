# AWS CDK Sample for using Amazon Inspector

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

[Amazon Inspector](https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html) is a vulnerability management service that continuously scans your AWS workloads for software vulnerabilities and unintended network exposure. Amazon Inspector automatically discovers and scans running Amazon EC2 instances, container images in Amazon Elastic Container Registry (Amazon ECR), and AWS Lambda functions for known software vulnerabilities and unintended network exposure.

Amazon Inspector creates a finding when it discovers a software vulnerability or network configuration issue. A finding describes the vulnerability, identifies the affected resource, rates the severity of the vulnerability, and provides remediation guidance. You can analyze findings using the Amazon Inspector console, or view and process your findings through other AWS services.

This AWS CDK sample demonstrates how to enable Amazon Inspector on a single AWS account.

## Enable Amazon Inspector in a single account

If you just want to programmatically enable Amazon Inspector in a single account you can use the sample to do that:

```ts
const inspector2EnableStack = new cdk.Stack(app, 'Inspector2EnableStack', { env });
new Inspector2EnableResource(inspector2EnableStack, 'EnableInspector2Resource', {
  resourceTypes: ['ECR', 'EC2', 'LAMBDA'],
});
```

## Enable Amazon Inspector in AWS Organization

See [Designating a delegated administrator for Amazon Inspector](https://docs.aws.amazon.com/inspector/latest/user/designating-admin.html) for limitations.

Amazon Inspector can be enabled for AWS Organization by setting the organization management account as a
designated administrator for Amazon Inspector and auto-enabling the required [scan types](https://docs.aws.amazon.com/inspector/latest/user/scanning-resources.html).

Note that if you set another acconunt as designated administrator account, you need to use the provided `Inspector2UpdateOrganizationConfigurationResource` in that
account to set the auto-enabled scan types.

```ts
new Inspector2EnableDelegatedAdminAccountResource(inspector2DelegatedAdminStack, 'Inspector2EnableDelegatedAdminAccountResource', {
  delegatedAdminAccountId: cdk.Aws.ACCOUNT_ID,
  inspector2EnableProps: {
    resourceTypes: ['ECR', 'EC2', 'LAMBDA'],
    logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
  },
  autoEnable: {
    ec2: true,
    ecr: true,
    lambda: true,
  },
  logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
});


```

## Handling Amazon Inspector scan results

The repository includes sample code for AWS Lambda deployed using AWS CDK which sets up a [EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html)
rule for event types `Inspector2 Scan` and `Inspector2 Finding`. User can implement required actions using TypeScript in the Lambda event handlers `inspector2-monitoring-resource.Inspector2FindingHandler.ts` or `inspector2-monitoring-resource.Inspector2InitialScanHandler.ts`.
