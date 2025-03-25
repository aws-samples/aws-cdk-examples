import { Template } from 'aws-cdk-lib/assertions';
import { IntegTesting } from '../src/integ.default';
import { normalizeTemplate } from '../../test-utils/normalize-template';

test('default validation', () => {
  const integ = new IntegTesting();
  integ.stack.forEach(stack => {
    const t = Template.fromStack(stack);
    // Normalize the template before snapshot comparison
    const normalizedTemplate = normalizeTemplate(t.toJSON());
    // should match snapshot
    expect(normalizedTemplate).toMatchSnapshot();
  });
});