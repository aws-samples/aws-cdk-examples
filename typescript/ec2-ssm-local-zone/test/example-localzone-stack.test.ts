import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ExampleLocalZoneStack } from '../example-localzone-stack';

test('ExampleLocalZoneStack has required resources', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new ExampleLocalZoneStack(app, 'ExampleLocalZoneStack', { });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
