import * as path from 'path';
import {
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';


export interface CustomRuntimeFunctionProps {
  /**
   * User executable to run from the lambda custom runtime
   *
   * @default main.sh
   */
  readonly userExecutable?: string;
  /**
   * lambda handler
   *
   * @default 'function.sh.handler'
   */
  readonly handler?: string;
  /**
   * lambda code assets
   * @default lambda.Code.fromAsset(path.join(__dirname, './lambda.d')),
   */
  readonly code?: lambda.Code;
  /**
   * lambda runtime
   * @default lambda.Runtime.PROVIDED_AL2,
   */
  readonly runtime?: lambda.Runtime;
  /**
   * lambda environment variables
   */
  readonly environment?: { [key: string]: string };
  /**
   * lambda memory size
   *
   * @default 128
   */
  readonly memorySize?: number;
}

export class CustomRuntimeFunction extends Construct {
  constructor(scope: Construct, id: string, props?: CustomRuntimeFunctionProps) {
    super(scope, id);

    new lambda.Function(this, 'Function', {
      ...props,
      runtime: props?.runtime ?? lambda.Runtime.PROVIDED_AL2,
      memorySize: props?.memorySize,
      handler: props?.handler ?? 'function.sh.handler',
      code: props?.code ?? lambda.Code.fromAsset(path.join(__dirname, './lambda.d')),
      environment: {
        ...props?.environment,
        USER_EXECUTABLE: props?.userExecutable ?? 'main.sh',
      },
    });
  }
}