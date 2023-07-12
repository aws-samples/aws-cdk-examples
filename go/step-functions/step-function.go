package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsstepfunctions"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsstepfunctionstasks"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type StepFunctionStackProps struct {
	awscdk.StackProps
}

func NewStepFunctionStack(scope constructs.Construct, id string, props *StepFunctionStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Lambda Definitions

	submit_lambda := awslambda.NewFunction(stack, jsii.String("submitLambda"), &awslambda.FunctionProps{
		Code:    awslambda.NewAssetCode(jsii.String("lambda/submit"), nil),
		Handler: jsii.String("index.lambda_handler"),
		Timeout: awscdk.Duration_Seconds(jsii.Number(3)),
		Runtime: awslambda.Runtime_PYTHON_3_9(),
	})

	status_lambda := awslambda.NewFunction(stack, jsii.String("statusLambda"), &awslambda.FunctionProps{
		Code:    awslambda.NewAssetCode(jsii.String("lambda/status"), nil),
		Handler: jsii.String("index.lambda_handler"),
		Timeout: awscdk.Duration_Seconds(jsii.Number(3)),
		Runtime: awslambda.Runtime_PYTHON_3_9(),
	})

	// Step Function Definition

	submit_job := awsstepfunctionstasks.NewLambdaInvoke(stack, jsii.String("submitJob"), &awsstepfunctionstasks.LambdaInvokeProps{
		LambdaFunction: submit_lambda,
		OutputPath:     jsii.String("$.Payload"),
	})

	wait_job := awsstepfunctions.NewWait(stack, jsii.String("waitJob"), &awsstepfunctions.WaitProps{
		Time: awsstepfunctions.WaitTime_Duration(awscdk.Duration_Seconds(jsii.Number(10))),
	})

	status_job := awsstepfunctionstasks.NewLambdaInvoke(stack, jsii.String("statusJob"), &awsstepfunctionstasks.LambdaInvokeProps{
		LambdaFunction: status_lambda,
		OutputPath:     jsii.String("$.Payload"),
	})

	fail_job := awsstepfunctions.NewFail(stack, jsii.String("failJob"), &awsstepfunctions.FailProps{
		Cause: jsii.String("AWS Step Function Job Failed"),
		Error: jsii.String("DescribeJob returned FAILED"),
	})

	succeed_job := awsstepfunctions.NewSucceed(stack, jsii.String("successJob"), &awsstepfunctions.SucceedProps{
		Comment: jsii.String("AWS Step Function Succeeded"),
	})

	definition := submit_job.Next(wait_job).
		Next(status_job).
		Next(awsstepfunctions.NewChoice(stack, jsii.String("jobComplete?"), &awsstepfunctions.ChoiceProps{}).
			When(awsstepfunctions.Condition_StringEquals(jsii.String("$.status"), jsii.String("FAILED")), fail_job).
			When(awsstepfunctions.Condition_StringEquals(jsii.String("$.status"), jsii.String("SUCCEEDED")), succeed_job).
			Otherwise(wait_job))

	// Create Step Function

	state_machine := awsstepfunctions.NewStateMachine(stack, jsii.String("stateMachine"), &awsstepfunctions.StateMachineProps{
		StateMachineName: jsii.String("MyStateMachine"),
		Definition:       definition,
		Timeout:          awscdk.Duration_Seconds(jsii.Number(300)),
	})

	// log state machine ARN
	awscdk.NewCfnOutput(stack, jsii.String("stateMachineArn"), &awscdk.CfnOutputProps{
		Value:       state_machine.StateMachineArn(),
		Description: jsii.String("State machine ARN"),
	})

	return stack
}

func main() {
	app := awscdk.NewApp(nil)

	NewStepFunctionStack(app, "StepFunctionStack", &StepFunctionStackProps{
		awscdk.StackProps{
			Env: env(),
		},
	})

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
