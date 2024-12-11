import * as cdk from 'aws-cdk-lib';
import {Match, Template} from 'aws-cdk-lib/assertions';
import {OrchestrationStack} from '../lib/orchestration-stack';
import {CfnJob} from 'aws-cdk-lib/aws-glue';

describe('OrchestrationStack', () => {
  let app: cdk.App;
  let stack: OrchestrationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();

    // Create mock Glue job reference
    const testStack = new cdk.Stack(app, 'TestStack');
    const mockGlueJob = new CfnJob(testStack, 'MockGlueJob', {
      name: 'mock-glue-job',
      command: {
        name: 'glueetl',
        pythonVersion: '3'
      },
      role: 'mock-role'
    });

    stack = new OrchestrationStack(app, 'TestOrchestrationStack', {
      etlJob: mockGlueJob
    });
    template = Template.fromStack(stack);
  });

  test('creates Lambda function with correct configuration', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'demo-glue-scheduled-aggregators-change-date-time',
      Handler: 'change_date_time_function.handler',
      Runtime: 'nodejs20.x',
      LoggingConfig: {
        LogFormat: 'JSON'
      }
    });
  });

  test('creates EventBus with correct name', () => {
    template.hasResourceProperties('AWS::Events::EventBus', {
      Name: 'demo-glue-scheduled-aggregators-event-bus'
    });
  });

  test('creates LogGroup with correct configuration', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/demos/demo-glue-scheduled-aggregators-orchestrator',
      RetentionInDays: 1
    });
  });

  test('creates StateMachine with correct configuration', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineName: 'demo-glue-scheduled-aggregators-orchestrator',
      StateMachineType: 'STANDARD',
      DefinitionSubstitutions: Match.objectLike({
        job_name: Match.anyValue(),
        function_name: Match.anyValue(),
        eventbus_name: Match.anyValue(),
      }),
      LoggingConfiguration: {
        Level: 'ALL',
        IncludeExecutionData: true
      }
    });
  });

  test('creates ScheduleGroup with correct name', () => {
    template.hasResourceProperties('AWS::Scheduler::ScheduleGroup', {
      Name: 'demo-glue-scheduled-aggregators-schedule-group'
    });
  });

  test('creates Schedule with correct configuration', () => {
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      Name: 'demo-glue-scheduled-aggregators-hourly-schedule',
      FlexibleTimeWindow: {
        Mode: 'OFF'
      },
      ScheduleExpression: 'cron(0 * * * ? *)'
    });
  });

  test('creates IAM role for Scheduler with correct permissions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'demo-glue-scheduled-aggregators-scheduler-execution-role',
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'scheduler.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }
        ]
      }
    });
  });

  test('StateMachine has correct IAM permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'glue:StartJobRun',
              'glue:GetJobRun'
            ],
            Resource: Match.anyValue()
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'events:PutEvents',
            Resource: Match.anyValue()
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'lambda:InvokeFunction',
            Resource: Match.anyValue()
          }),
        ]),
      }
    });
  });

  test('creates correct outputs', () => {
    template.hasOutput('StateMachineName', {});
    template.hasOutput('EventBusName', {});
  });
  
});
