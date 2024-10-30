import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ConnectCdk from '../lib/connect_cdk-stack';


test('Connect Instance and Lambda Function Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new ConnectCdk.ConnectCdkStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Check that Connect instance is created
  template.hasResourceProperties('AWS::Connect::Instance', {
    IdentityManagementType: 'CONNECT_MANAGED'
  });

  // Check that a Lambda function is created
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'python3.12',
    Handler: 'lambda_function.lambda_handler'
  });
});
