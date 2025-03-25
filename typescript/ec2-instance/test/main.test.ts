import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EC2Example } from '../src/ec2-instance';
import { InstanceSize, CPUTypes } from '../src/envValidator';

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const stackProps = {
  logLevel: '',
  sshPubKey: '',
  cpuType: '',
  instanceSize: '',
};

const app = new App();

const stack = new Stack(app, 'testing-stack', {
  ...stackProps,
  env: devEnv,
});

test('Snapshot', () => {
  new EC2Example(stack, 'EC2Example', {
    ...stackProps,
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

test('LARGE', () => {
  new EC2Example(stack, 'LARGE_Test', {
    ...stackProps,
    instanceSize: 'LARGE',
  });
});

test('XLARGE', () => {
  new EC2Example(stack, 'XLARGE_Test', {
    ...stackProps,
    instanceSize: 'XLARGE',
  });
});

test('XLARGE2', () => {
  new EC2Example(stack, 'XLARGE2_Test', {
    ...stackProps,
    instanceSize: 'XLARGE2',
  });
});

test('XLARGE4', () => {
  new EC2Example(stack, 'XLARGE4_Test', {
    ...stackProps,
    instanceSize: 'XLARGE4',
  });
});

test('ARM64', () => {
  new EC2Example(stack, 'ARM64_Test', {
    ...stackProps,
    cpuType: 'ARM64',
  });
});

test('X86', () => {
  new EC2Example(stack, 'X86_Test', {
    ...stackProps,
    cpuType: 'X86',
  });
});

test('BadSize', () => {
  const validSizes = Object.keys(InstanceSize).join(', ');
  expect(
    () =>
      new EC2Example(stack, 'BadSize', {
        ...stackProps,
        instanceSize: 'BAD_SIZE',
      }),
  ).toThrowError(`Invalid instance size. Valid sizes are: ${validSizes}`);
});

test('BadCPU', () => {
  const validCpuTypes = Object.keys(CPUTypes).join(', ');
  expect(
    () =>
      new EC2Example(stack, 'BadCPU', {
        ...stackProps,
        cpuType: 'BAD_CPU',
      }),
  ).toThrowError(`Invalid CPU type.  Valid CPU Types are ${validCpuTypes}`);
});
