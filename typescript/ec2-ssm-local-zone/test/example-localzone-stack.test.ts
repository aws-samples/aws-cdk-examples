import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ExampleLocalZoneStack } from '../example-localzone-stack';
import { normalizeTemplate } from '../../test-utils/normalize-template';

test('ExampleLocalZoneStack has required resources', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new ExampleLocalZoneStack(app, 'ExampleLocalZoneStack', { });

  const template = Template.fromStack(stack);
  const normalizedTemplate = normalizeTemplate(template.toJSON());
  expect(normalizedTemplate).toMatchSnapshot();
});
