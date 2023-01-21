import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Inspector2EnableResource } from '../lib/inspector2-enable-resource';

test('Inspector2EnableResource creates required resources', () => {
  const app = new cdk.App();

  const stack = new cdk.Stack(app, 'Inspector2EnableStack', { });
  new Inspector2EnableResource(stack, 'EnableInspector2Resource', {
    resourceTypes: ['ECR', 'EC2', 'LAMBDA'],
    logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
