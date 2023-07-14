import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CustomRuntimeFunction } from '../src/function';
import { MyStack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new MyStack(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

test('smallest required props', () => {
  // Given
  const app = new App();
  const stack = new Stack(app, 'test');
  // When
  new CustomRuntimeFunction(stack, 'Func');

  // Then
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        USER_EXECUTABLE: 'main.sh',
      },
    },
    Handler: 'function.sh.handler',
    Runtime: 'provided.al2',
  });
});