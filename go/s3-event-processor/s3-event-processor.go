package main

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambdaeventsources"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3"
	"github.com/aws/aws-cdk-go/awscdk/v2/awss3notifications"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssns"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssnssubscriptions"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssqs"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type S3EventProcessorStackProps struct {
	awscdk.StackProps
}

func NewS3EventProcessorStack(scope constructs.Construct, id string, props *S3EventProcessorStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	uploadBucket := awss3.NewBucket(stack, jsii.String("UploadBucket"), &awss3.BucketProps{
		BlockPublicAccess: awss3.BlockPublicAccess_BLOCK_ALL(),
		EnforceSSL:        jsii.Bool(true),
		Versioned:         jsii.Bool(true),
		Encryption:        awss3.BucketEncryption_S3_MANAGED,
		LifecycleRules: &[]*awss3.LifecycleRule{
			{
				Enabled:    jsii.Bool(true),
				Expiration: awscdk.Duration_Days(jsii.Number(60)),
				Transitions: &[]*awss3.Transition{
					{
						StorageClass:    awss3.StorageClass_GLACIER(),
						TransitionAfter: awscdk.Duration_Days(jsii.Number(30)),
					},
				},
			},
		},
	})

	objectCreatedTopic := awssns.NewTopic(stack, jsii.String("ObjectCreatedTopic"), &awssns.TopicProps{
		TopicName: jsii.String("s3-object-created-topic"),
	})

	objectCreatedQueue := awssqs.NewQueue(stack, jsii.String("ObjectCreatedQueue"), &awssqs.QueueProps{
		QueueName:  jsii.String("s3-object-created-queue"),
		Encryption: awssqs.QueueEncryption_SQS_MANAGED,
		EnforceSSL: jsii.Bool(true),
	})
	//Buffer for records that failed to process. Useful for troubleshooting and recovery.
	objectCreatedDlQueue := awssqs.NewQueue(stack, jsii.String("ObjectCreatedDlQueue"), &awssqs.QueueProps{
		QueueName:  jsii.String("s3-object-created-dl-queue"),
		Encryption: awssqs.QueueEncryption_SQS_MANAGED,
		EnforceSSL: jsii.Bool(true),
	})

	uploadBucket.AddObjectCreatedNotification(awss3notifications.NewSnsDestination(objectCreatedTopic))
	objectCreatedTopic.AddSubscription(awssnssubscriptions.NewSqsSubscription(objectCreatedQueue, &awssnssubscriptions.SqsSubscriptionProps{
		RawMessageDelivery: jsii.Bool(true),
		DeadLetterQueue:    objectCreatedDlQueue,
	}))

	objectCreatedHandler := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("ObjectCreatedHandler"), &awscdklambdagoalpha.GoFunctionProps{
		FunctionName: jsii.String("s3-object-created-handler"),
		Entry:        jsii.String("lambda/create-object-handler"),
		CurrentVersionOptions: &awslambda.VersionOptions{
			RemovalPolicy: awscdk.RemovalPolicy_RETAIN,
		},
	})
	//Processing will be handled by a function Alias, allowing us adjust the function version used for processing.
	objectCreatedHandlerLiveAlias := objectCreatedHandler.AddAlias(jsii.String("live"), &awslambda.AliasOptions{})

	objectCreatedHandlerLiveAlias.AddEventSource(
		awslambdaeventsources.NewSqsEventSource(objectCreatedQueue, &awslambdaeventsources.SqsEventSourceProps{
			ReportBatchItemFailures: jsii.Bool(true),
			MaxConcurrency:          jsii.Number(2),
			BatchSize:               jsii.Number(10),
			MaxBatchingWindow:       awscdk.Duration_Seconds(jsii.Number(10)),
		}),
	)

	awscdk.NewCfnOutput(stack, jsii.String("S3BucketUrl"), &awscdk.CfnOutputProps{
		Value: jsii.String("s3://" + *uploadBucket.BucketName()),
	})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	NewS3EventProcessorStack(app, "S3EventProcessorStack", &S3EventProcessorStackProps{
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
