import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as stepFunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ApiGatewayParallelStepFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const { vpc: vpcLambda } = new VpcNestedStack(this, 'nested-stack-lambda');

    const lambdaFunction1 = new lambda.Function(this, 'lambda-function-1', {
      runtime: lambda.Runtime.NODEJS_18_X,
      vpc: vpcLambda,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '/my-lambda-1')),
      environment: {
        VPC_CIDR: vpcLambda.vpcCidrBlock,
        VPC_ID: vpcLambda.vpcId,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    })

    const lambdaFunction2 = new lambda.Function(this, 'lambda-function-2', {
      runtime: lambda.Runtime.NODEJS_18_X,
      vpc: vpcLambda,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '/my-lambda-2')),
      environment: {
        VPC_CIDR: vpcLambda.vpcCidrBlock,
        VPC_ID: vpcLambda.vpcId,
      },
      logRetention: logs.RetentionDays.ONE_DAY,
    })

    // Do 2 different jobs in parallel
    const parallel = new stepFunctions.Parallel(this, 'two-jobs', {
      resultPath: '$.CombinedOutput'
    })
      .branch(
        new MyJob(this, 'quick-job', {
          lambdaFunction: lambdaFunction1,
        }).prefixStates()
      )
      .branch(
        new MyJob(this, 'slow-job', {
          lambdaFunction: lambdaFunction2,
        }).prefixStates()
      );

    const merge = new stepFunctions.Pass(this, 'merge-outcomes', {
      parameters: {
        'normal.$': '$.CombinedOutput[0].Payload.body',
        'fast.$': '$.CombinedOutput[1].Payload.body',
      },
    });

    parallel.next(merge);

    const stfLogGroup = new logs.LogGroup(this, 'stepfunctions-loggroup');
    const stateMachine = new stepFunctions.StateMachine(
      this,
      'my-state-machine',
      {
        definitionBody: stepFunctions.DefinitionBody.fromChainable(parallel),
        stateMachineType: stepFunctions.StateMachineType.EXPRESS,
        logs: {
          destination: stfLogGroup,
          level: stepFunctions.LogLevel.ALL,
        },
      }
    )

    const api = new apigateway.StepFunctionsRestApi(this, 'my-api', {
      stateMachine,
      description: 'example api gateway',
      deployOptions: {
        stageName: 'dev',
      }
    });

    const items = api.root.addResource('messages');
    items.addMethod('GET');
  }
}

class VpcNestedStack extends cdk.NestedStack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'nested-stack-vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        // 👇 added private isolated subnets
        {
          name: 'private-isolated-subnet-1',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ]
    });
  }
}

class MyJob extends stepFunctions.StateMachineFragment {
  public readonly startState: stepFunctions.State;
  public readonly endStates: stepFunctions.INextable[];

  constructor(parent: Construct, id: string, props: any) {
    super(parent, id);

    this.startState = new tasks.LambdaInvoke(this, 'my-lambda-task', {
      lambdaFunction: props.lambdaFunction
    });
  }
}

const app = new cdk.App();
new ApiGatewayParallelStepFunctionsStack(
  app,
  'apigateway-parallel-stepfunctions-stack-2'
)
app.synth();
