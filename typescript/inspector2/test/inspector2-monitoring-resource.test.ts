import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Inspector2MonitoringResource } from '../lib/inspector2-monitoring-resource';
import { normalizeTemplate } from '../../test-utils/normalize-template';

test('Inspector2MonitoringResource creates required resources', () => {
  const app = new cdk.App();

  const stack = new cdk.Stack(app, 'Inspector2MonitoringStack', { });
  new Inspector2MonitoringResource(stack, 'Inspector2Monitoring', { });

  const template = Template.fromStack(stack);
  const normalizedTemplate = normalizeTemplate(template.toJSON());
  expect(normalizedTemplate).toMatchSnapshot();
});
