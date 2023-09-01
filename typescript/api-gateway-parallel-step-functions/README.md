# APIGateway with parallel Step Functions

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

This an example of an APIGateway with Express Step Functions integrated. The Step Functions invokes two Lambda functions in parallel. The outcomes from these two Lambda functions are aggregated and returned as the response through APIGateway.

## Sample response

```json
{
    "normal":"{\"message\":\"Hello World!\"}",
    "fast":"{\"message\":\"Hello World zzZ! (Sleepy)\"}"
}
```

Property `normal` is the outcome from Lambda-1 and `fast` is the outcome from Lambda-2.


## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
```

This will install the necessary CDK, then this example's dependencies.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

After building your TypeScript code, you will be able to run the CDK toolkit commands as usual:

```bash
    $ cdk ls
    <list all stacks in this program>

    $ cdk synth
    <generates and outputs cloudformation template>

    $ cdk deploy
    <deploys stack to your account>

    $ cdk diff
    <shows diff against deployed stack>
```
