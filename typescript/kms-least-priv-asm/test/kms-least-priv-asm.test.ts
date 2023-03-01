import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as KmsLeastPrivAsm from '../lib/kms-least-priv-asm-stack';

test('KMS key and ASM Test', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new KmsLeastPrivAsm.KmsLeastPrivAsmStack(app, 'MyTestStack');
    // THEN
  const template = Template.fromStack(stack);
    // Assert the template matches the snapshot.
  expect(template.toJSON()).toMatchSnapshot();
});
