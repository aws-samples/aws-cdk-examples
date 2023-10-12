package main

import (
	"context"
	"io"
	"log"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	"github.com/aws/aws-cdk-go/awscdk/v2/awssagemaker"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/tidwall/gjson"
)

// StackProps and additional properties to be used by the stack.
type EndpointJumpstartStackProps struct {
	awscdk.StackProps
	ImageURL     *string
	ModelDataURL *string
	Environment  map[string]*string
	InstanceType *string
	EndpointName *string
}

// Uses go sdk to retrieve JumpStart Model info form JumpStart public S3 bucket.
func loadJumpstartModelInfo(props *EndpointJumpstartStackProps, modelID, modelVersion string) error {
	region := *props.StackProps.Env.Region
	bucketName := "jumpstart-cache-prod-" + region
	objectKey := "community_models/" + modelID + "/specs_v" + modelVersion + ".json"

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
	)
	if err != nil {
		log.Fatalf("failed to load configuration, %v", err)
	}
	s3Client := s3.NewFromConfig(cfg)

	result, err := s3Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &bucketName,
		Key:    &objectKey,
	})
	if err != nil {
		// If accessing to the JumpStart S3 bucket fails, it falls back to the default values for this example.
		props.Environment = map[string]*string{
			"MODEL_CACHE_ROOT":               jsii.String("/opt/ml/model"),
			"ENDPOINT_SERVER_TIMEOUT":        jsii.String("3600"),
			"SAGEMAKER_ENV":                  jsii.String("1"),
			"SAGEMAKER_MODEL_SERVER_TIMEOUT": jsii.String("3600"),
			"SAGEMAKER_MODEL_SERVER_WORKERS": jsii.String("1"),
			"SAGEMAKER_CONTAINER_LOG_LEVEL":  jsii.String("20"),
			"SAGEMAKER_REGION":               jsii.String(region),
			"SAGEMAKER_SUBMIT_DIRECTORY":     jsii.String("/opt/ml/model/code"),
			"SAGEMAKER_PROGRAM":              jsii.String("inference.py"),
		}
		props.ImageURL = jsii.String("763104351884.dkr.ecr." + region + ".amazonaws.com/huggingface-pytorch-inference:1.13.1-transformers4.26.0-gpu-py39-cu117-ubuntu20.04")
		props.ModelDataURL = jsii.String("s3://jumpstart-cache-prod-" + region + "/huggingface-infer/prepack/v1.1.2/infer-prepack-huggingface-text2text-flan-t5-small.tar.gz")
		return nil
	}

	defer result.Body.Close()

	// Read the S3 object content into a string.
	data, err := io.ReadAll(result.Body)
	if err != nil {
		return err
	}
	jsonData := string(data)

	// Extract model info from the json data.
	props.ImageURL = jsii.String(gjson.Get(jsonData, "hosting_instance_type_variants.regional_aliases."+region+".gpu_ecr_uri_2").String())
	props.ModelDataURL = jsii.String("s3://" + bucketName + "/" + gjson.Get(jsonData, "hosting_prepacked_artifact_key").String())

	environment := make(map[string]*string)
	gjson.Get(jsonData, "inference_environment_variables").ForEach(func(key, value gjson.Result) bool {
		name := value.Get("name").String()
		environment[name] = jsii.String(value.Get("default").String())
		return true
	})
	environment["SAGEMAKER_REGION"] = jsii.String(region)
	props.Environment = environment

	return nil
}

func NewEndpointJumpstartStack(scope constructs.Construct, id string, props *EndpointJumpstartStackProps) awscdk.Stack {
	var sprops awscdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := awscdk.NewStack(scope, &id, &sprops)

	// Create an IAM role for the SageMaker endpoint.
	serviceRole := awsiam.NewRole(stack, jsii.String("EndpointRole"), &awsiam.RoleProps{
		AssumedBy:   awsiam.NewServicePrincipal(jsii.String("sagemaker.amazonaws.com"), nil),
		Description: jsii.String("Role for SageMaker endpoint"),
	})

	// Add a S3 ReadOnly access policy to read JumpStart artifacts from S3.
	// Adjust this policy accordingly if you are using your own model artifacts.
	serviceRole.AddManagedPolicy(awsiam.ManagedPolicy_FromAwsManagedPolicyName(
		jsii.String("AmazonS3ReadOnlyAccess")))

	// Add permissions to write logs to CloudWatch and assume roles.
	// ECR read permissions are required to pull the JumpStart containers.
	serviceRole.AddToPolicy(awsiam.NewPolicyStatement(&awsiam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("sts:AssumeRole"),
			jsii.String("logs:DescribeLogStreams"),
			jsii.String("logs:CreateLogStream"),
			jsii.String("logs:CreateLogGroup"),
			jsii.String("logs:PutLogEvents"),
			jsii.String("ecr:BatchGetImage"),
			jsii.String("ecr:Get*"),
		},
		Resources: &[]*string{
			jsii.String("*"),
		},
	}))

	// Create the SageMaker JumpStart model.
	model := awssagemaker.NewCfnModel(stack, jsii.String("Model"), &awssagemaker.CfnModelProps{
		ExecutionRoleArn: serviceRole.RoleArn(),
		Containers: []interface{}{
			&awssagemaker.CfnModel_ContainerDefinitionProperty{
				Image:        props.ImageURL,
				ModelDataUrl: props.ModelDataURL,
				Environment:  props.Environment,
			},
		},
	})

	// Create the SageMaker endpoint configuration.
	endpointConfig := awssagemaker.NewCfnEndpointConfig(
		stack, jsii.String("EndpointConfig"), &awssagemaker.CfnEndpointConfigProps{
			ProductionVariants: []awssagemaker.CfnEndpointConfig_ProductionVariantProperty{
				{
					ModelName:            model.AttrModelName(),
					InstanceType:         props.InstanceType,
					VariantName:          jsii.String("AllTraffic"),
					InitialInstanceCount: jsii.Number(1),
					InitialVariantWeight: jsii.Number(1),
				},
			},
		})

	// Create the SageMaker endpoint.
	endpoint := awssagemaker.NewCfnEndpoint(stack, jsii.String("Endpoint"),
		&awssagemaker.CfnEndpointProps{
			EndpointConfigName: endpointConfig.AttrEndpointConfigName(),
			EndpointName:       props.EndpointName,
		})

	// Add EndpointName as CloudFormation output.
	awscdk.NewCfnOutput(stack, jsii.String("EndpointName"),
		&awscdk.CfnOutputProps{
			Value: endpoint.EndpointName(),
		})

	return stack
}

func main() {
	defer jsii.Close()

	app := awscdk.NewApp(nil)

	// Set the parameters to define which JumpStart model and version to use
	// and the SageMaker inference instance type for the endpoint.
	jumpstartModelId := "huggingface-text2text-flan-t5-small"
	jumpstartModelVersion := "1.3.2"
	sageMakerInferenceInstanceType := jsii.String("ml.g5.2xlarge")
	endpointName := jsii.String("flan-t5-small-endpoint")

	props := &EndpointJumpstartStackProps{
		StackProps: awscdk.StackProps{
			Env: env(),
		},
		InstanceType: sageMakerInferenceInstanceType,
		EndpointName: endpointName,
	}

	// Load the JumpStart model info from the JumpStart public S3 bucket
	err := loadJumpstartModelInfo(
		props, jumpstartModelId, jumpstartModelVersion,
	)
	if err != nil {
		log.Fatalf("Error: %v", err)
		return
	}

	// Create the stack.
	NewEndpointJumpstartStack(app, "SageMakerEndpointJumpstartStack", props)

	app.Synth(nil)
}

// env determines the AWS environment (account+region) in which our stack is to
// be deployed. For more information see: https://docs.aws.amazon.com/cdk/latest/guide/environments.html
func env() *awscdk.Environment {
	// If unspecified, this stack will be "environment-agnostic".
	// Account/Region-dependent features and context lookups will not work, but a
	// single synthesized template can be deployed anywhere.
	//---------------------------------------------------------------------------
	// return nil

	// Uncomment if you know exactly what account and region you want to deploy
	// the stack to. This is the recommendation for production stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String("123456789012"),
	//  Region:  jsii.String("us-east-1"),
	// }
	return &awscdk.Environment{
		Region: jsii.String("us-east-1"),
	}

	// Uncomment to specialize this stack for the AWS Account and Region that are
	// implied by the current CLI configuration. This is recommended for dev
	// stacks.
	//---------------------------------------------------------------------------
	// return &awscdk.Environment{
	//  Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
	//  Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	// }
}
