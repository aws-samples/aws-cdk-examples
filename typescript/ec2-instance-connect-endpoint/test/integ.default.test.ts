import { Template } from 'aws-cdk-lib/assertions';
import { IntegTesting } from '../src/integ.default';

test('default validation', () => {
  const integ = new IntegTesting();
  integ.stack.forEach(stack => {
    const t = Template.fromStack(stack);
    // should match snapshot
    expect(t).toMatchSnapshot();
  });
});