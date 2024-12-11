import * as cdk from "aws-cdk-lib";
import {RemovalPolicy} from "aws-cdk-lib";
import {DefinitionBody, LogLevel, StateMachine, StateMachineType} from "aws-cdk-lib/aws-stepfunctions";
import {LogGroup, RetentionDays} from "aws-cdk-lib/aws-logs";
import {Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {CfnSchedule, CfnScheduleGroup} from "aws-cdk-lib/aws-scheduler";
import {Code, Function, LoggingFormat, Runtime} from "aws-cdk-lib/aws-lambda";
import {EventBus} from "aws-cdk-lib/aws-events";
import {CfnJob} from "aws-cdk-lib/aws-glue";

interface OrchestrationStackProps {

  readonly etlJob: CfnJob;

}

export class OrchestrationStack extends cdk.Stack {

  public readonly stateMachine: StateMachine;

  constructor(scope: cdk.App, id: string, props: OrchestrationStackProps) {
    super(scope, id);

    // Lambda function to decrease 1 hour of the current time
    const changeDateTimeFunction = new Function(this, 'ChangeDateTimeFunction', {
      functionName: 'demo-glue-scheduled-aggregators-change-date-time',
      handler: "change_date_time_function.handler",
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset('./job/orchestrator/lambda'),
      loggingFormat: LoggingFormat.JSON
    });


    // EventBus to receive events related to fail workflows
    const eventsBus = new EventBus(this, 'DemoEventBus', {
      eventBusName: 'demo-glue-scheduled-aggregators-event-bus'
    });


    // State Machine configuration
    const logGroup = new LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: '/aws/demos/demo-glue-scheduled-aggregators-orchestrator',
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.stateMachine = new StateMachine(this, 'OrchestratorStateMachine', {
      stateMachineName: 'demo-glue-scheduled-aggregators-orchestrator',
      definitionBody: DefinitionBody.fromFile('./job/orchestrator/configuration.json'),
      definitionSubstitutions: {
        "job_name": props.etlJob.ref,
        "function_name": changeDateTimeFunction.functionName,
        "eventbus_name": eventsBus.eventBusName
      },
      timeout: cdk.Duration.minutes(45),
      stateMachineType: StateMachineType.STANDARD,
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
        includeExecutionData: true
      }
    });


    // State Machine Permissions
    const stateMachineToGluePermissions = new PolicyStatement({
        actions: [
          'glue:StartJobRun',
          'glue:GetJobRun'
        ],
        resources: [`arn:aws:glue:*:${this.account}:job/*`]
      }
    );

    const stateMachineToEventBridgePermissions = new PolicyStatement({
        actions: [
          'events:PutEvents'
        ],
        resources: [`arn:aws:events:*:${this.account}:event-bus/*`]
      }
    );

    this.stateMachine.addToRolePolicy(stateMachineToGluePermissions);
    this.stateMachine.addToRolePolicy(stateMachineToEventBridgePermissions);
    changeDateTimeFunction.grantInvoke(this.stateMachine);
    eventsBus.grantPutEventsTo(this.stateMachine);


    // Scheduler configuration
    const scheduleGroup = new CfnScheduleGroup(this, 'ScheduleGroup', {
      name: 'demo-glue-scheduled-aggregators-schedule-group'
    });

    const schedulerToStepFunctionsRole = new Role(this, 'SchedulerExecutionRole', {
      assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
      roleName: 'demo-glue-scheduled-aggregators-scheduler-execution-role',
      inlinePolicies: {
        'StepFunctionsExecutionPolicy': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['states:StartExecution'],
              resources: [this.stateMachine.stateMachineArn],
              effect: Effect.ALLOW
            })
          ]
        })
      }
    });

    const schedule = new CfnSchedule(this, 'EventSchedule', {
      name: "demo-glue-scheduled-aggregators-hourly-schedule",
      groupName: scheduleGroup.ref,
      flexibleTimeWindow: {
        mode: "OFF"
      },
      scheduleExpression: "cron(0 * * * ? *)",
      target: {
        arn: this.stateMachine.stateMachineArn,
        roleArn: schedulerToStepFunctionsRole.roleArn,
        input: this.toJsonString({
          "target_datetime": "<aws.scheduler.scheduled-time>"
        })
      }
    });


    // Outputs
    new cdk.CfnOutput(this, 'StateMachineName', {value: this.stateMachine.stateMachineName});
    new cdk.CfnOutput(this, 'EventBusName', {value: eventsBus.eventBusName});
    new cdk.CfnOutput(this, 'EventScheduleName', {value: schedule.ref});
  }

}
