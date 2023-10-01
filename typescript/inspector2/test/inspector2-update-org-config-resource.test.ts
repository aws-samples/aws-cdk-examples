import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Inspector2UpdateOrganizationConfigurationResource } from '../lib/inspector2-update-org-config-resource';

test('Inspector2UpdateOrganizationConfigurationResource creates required resources', () => {
  const app = new cdk.App();

  const stack = new cdk.Stack(app, 'Inspector2EnableStack', { });

  new Inspector2UpdateOrganizationConfigurationResource(stack, 'Inspector2UpdateOrganizationConfigurationResource', {
    autoEnable: {
      ec2: true,
      ecr: true,
      lambda: true,
    },
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
