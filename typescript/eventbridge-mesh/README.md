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
