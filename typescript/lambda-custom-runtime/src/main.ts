import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CustomRuntimeFunction } from './function';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new CustomRuntimeFunction(this, 'Func', {
      userExecutable: 'main.sh',
      memorySize: 256,
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'lambda-custom-runtime-dev', { env: devEnv });

app.synth();