import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EC2Stack } from '../lib/ec2-stack';
import { InstanceSize, CPUTypes } from '../lib/utils/env-validator';
import { normalizeTemplate } from '../../test-utils/normalize-template';

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const stackProps = {
  logLevel: 'INFO',
  sshPubKey: '',
  cpuType: 'ARM64',
  instanceSize: 'LARGE',
};

describe('EC2Stack', () => {
  test('Snapshot test', () => {
    const app = new App();
    const stack = new EC2Stack(app, 'TestStack', {
      ...stackProps,
      env: devEnv,
    });

    const template = Template.fromStack(stack);
    const normalizedTemplate = normalizeTemplate(template.toJSON());
    expect(normalizedTemplate).toMatchSnapshot();
  });

  test('Instance size validation', () => {
    const app = new App();

    // Valid sizes should not throw errors
    Object.keys(InstanceSize).forEach(size => {
      expect(() => {
        new EC2Stack(app, `Test-${size}`, {
          ...stackProps,
          instanceSize: size,
          env: devEnv,
        });
      }).not.toThrow();
    });

    // Invalid size should throw error
    const validSizes = Object.keys(InstanceSize).join(', ');
    expect(() => {
      new EC2Stack(app, 'TestInvalidSize', {
        ...stackProps,
        instanceSize: 'BAD_SIZE',
        env: devEnv,
      });
    }).toThrowError(`Invalid instance size. Valid sizes are: ${validSizes}`);
  });

  test('CPU type validation', () => {
    const app = new App();

    // Valid CPU types should not throw errors
    Object.keys(CPUTypes).forEach(cpuType => {
      expect(() => {
        new EC2Stack(app, `Test-${cpuType}`, {
          ...stackProps,
          cpuType: cpuType,
          env: devEnv,
        });
      }).not.toThrow();
    });

    // Invalid CPU type should throw error
    const validCpuTypes = Object.keys(CPUTypes).join(', ');
    expect(() => {
      new EC2Stack(app, 'TestInvalidCPU', {
        ...stackProps,
        cpuType: 'BAD_CPU',
        env: devEnv,
      });
    }).toThrowError(`Invalid CPU type. Valid CPU Types are ${validCpuTypes}`);
  });
});
