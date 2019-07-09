# APIGateway with CORS, Lambdas, and CRUD on DynamoDB
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples does is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This an example of an APIGateway with CORS enabled, pointing to five Lambdas executing CRUD operations on a single DynamoDB table.

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## The Component Structure

The whole component contains:

- An API, with CORS enabled on all HTTTP Methods. (Use with caution, for production apps you will want to enable only a certain domain origin to be able to query your API.)
- Lambda pointing to `src/create.ts`, containing code for __storing__ an item  into the DynamoDB table.
- Lambda pointing to `src/delete-one.ts`, containing code for __deleting__ an item from the DynamoDB table.
- Lambda pointing to `src/get-all.ts`, containing code for __getting all items__ from the DynamoDB table.
- Lambda pointing to `src/get-one.ts`, containing code for __getting an item__ from the DynamoDB table.
- Lambda pointing to `src/update-one.ts`, containing code for __updating an item__ in the DynamoDB table.
- A DynamoDB table `items` that stores the data.
- Five `LambdaIntegrations` that connect these Lambdas to the API.

## CDK Toolkit

The [`cdk.json`](./cdk.json) file in the root of this repository includes
instructions for the CDK toolkit on how to execute this program.

After building your TypeScript code, you will be able to run the CDK toolkits commands as usual:

    $ cdk ls
    <list all stacks in this program>

    $ cdk synth
    <generates and outputs cloudformation template>

    $ cdk deploy
    <deploys stack to your account>

    $ cdk diff
    <shows diff against deployed stack>
