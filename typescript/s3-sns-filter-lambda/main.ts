import 'dotenv/config';

import { App, Environment } from 'aws-cdk-lib';

import { Stacks } from './constants';
import { LambdaStack, RoleStack, SnsStack, StorageStack } from './stacks';
import { config } from './utils';

const app = new App();

const env: Environment = {
  account: config.aws.accountId,
  region: config.aws.region
};

const roleStack = new RoleStack(app, Stacks.RoleStack, { env });
const storageStack = new StorageStack(app, Stacks.StorageStack, { env });
const snsStack = new SnsStack(app, Stacks.SnsStack, { env });

new LambdaStack(app, Stacks.LambdaStack, {
  env,
  serviceBucketArn: storageStack.serviceBucket.bucketArn,
  s3TriggerSnsTopicArn: snsStack.s3TriggerSnsTopic.topicArn,
  s3ListenerRoleArn: roleStack.s3ListenerRole.roleArn,
  defaultLambdaRoleArn: roleStack.defaultLambdaRole.roleArn
});
