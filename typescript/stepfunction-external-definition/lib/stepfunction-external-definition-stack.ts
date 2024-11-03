import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from "aws-cdk-lib/aws-iam";
import * as fs from "fs";

export class StepfunctionExternalDefinitionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logGroup = new logs.LogGroup(this, 'MyStateMachineLogGroup', {
      logGroupName: '/aws/vendedlogs/states/MyStateMachine',
      retention: logs.RetentionDays.ONE_WEEK, 
    });
    
    const workflow = fs.readFileSync('./workflow/stepfunction.json.asl', 'utf8');
    const stateMachine= new stepfunctions.StateMachine(this, 'MyStateMachine', {
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      definitionBody: stepfunctions.DefinitionBody.fromString(workflow.toString()),
      logs: {
        destination: logGroup,
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
    logGroup.grantWrite(stateMachine.role);

    const api = new apigateway.RestApi(this, "StepFuncApi", {
      restApiName: "StepFuncApi",
      description: "StepFuncApi",
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });
    const resource = api.root.addResource("orders");
    resource.addMethod("GET", apigateway.StepFunctionsIntegration.startExecution(stateMachine));
  }
}
