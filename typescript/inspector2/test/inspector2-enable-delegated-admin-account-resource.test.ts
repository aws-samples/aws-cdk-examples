import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Inspector2EnableDelegatedAdminAccountResource } from '../lib/inspector2-enable-delegated-admin-account-resource';

test('Inspector2EnableDelegatedAdminAccountResource creates required resources', () => {
  const app = new cdk.App();

  const stack = new cdk.Stack(app, 'Inspector2EnableDelegatedAdminAccountStack', { });
  new Inspector2EnableDelegatedAdminAccountResource(stack, 'Inspector2EnableDelegatedAdminAccountResource', {
    delegatedAdminAccountId: '12345676543',
    logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
    inspector2EnableProps: {
    },
    autoEnable: {
      ec2: true,
      ecr: true,
      lambda: true,
    },
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
