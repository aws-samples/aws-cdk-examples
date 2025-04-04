# CDK Sample: Event Bridge mesh with CDK

## Description:
A CDK way to set up a Event Bridge Mesh(Cross-Account), where you relay the messages from one Event Bridge in a producer account to another Event Bridge in a consumer account

## Backgroud:
This is a CDK application that implements cross-account event routing using Amazon EventBridge. It's designed for enterprise scenarios where:

- Teams work in separate AWS accounts (producer and consumer)
- Consumer teams need autonomy to manage their event processing
- Event routing changes shouldn't require coordination with producer teams

## Solution:

### Single consumer
![architecture](./images/single-consumer.png)

### Multiple consumers
![architecture](./images/multi-consumers.png)


## Instructions

### Single consumer:
1. Run: `cd single-consumer`
2. Change the values of `producerAccountId` and `consumerAccountId` in `cdk.json`
3. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html
```ruby
npm run build

cdk ls

cdk synth

cdk deploy --all
```

### Multiple consumers:
1. Run: `cd multiple-consumer`
2. Change the values of `producerAccountId`, `consumer1AccountId`, and `consumer2AccountId` in `cdk.json`
3. Install and configure the CDK: https://docs.aws.amazon.com/CDK/latest/userguide/install_config.html
```ruby
npm run build

cdk ls

cdk synth

cdk deploy --all
```
