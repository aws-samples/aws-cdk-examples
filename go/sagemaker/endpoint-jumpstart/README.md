# SageMaker Endpoint using JumpStart Models

This example creates a new Amazon SageMaker Endpoint using a foundation model from the SageMaker JumpStart model repository.

This project is intended to be a sample code only. Not for use in production.

This project will create the following in your AWS cloud environment:

- **IAM Role**: to be assumed by the SageMaker endpoint. It provides the required permissions for the SageMaker endpoint, access to S3 (for the model artifacts), and necessary permissions for logging, ECR, and STS.

- **SageMaker Endpoint**: Creates a SageMaker model using the specified container and model artifact (form the JumpStart model repository). Then, creates a SageMaker endpoint using the model.

## Setup

The `EndpointJumpstartStackProps` struct captures additional properties:

- `ImageURL`: URI of the Docker container for the model.
- `ModelDataURL`: S3 path to the pre-packed model artifact.
- `Environment`: A map of environment variables to pass to the SageMaker endpoint container.
- `InstanceType`: The type of EC2 instance for the SageMaker endpoint.
- `EndpointName`: Custom name for the SageMaker endpoint.


The `loadJumpstartModelInfo` function fetches the model details from the public JumpStart S3 bucket, which includes details like the model's container image URI, model artifact location, etc. This function fall backs to the default values if Jumpstart S3 bucket is not accessible.

Default values:
- Region: `us-east-1`
- JumpStart model ID: `huggingface-text2text-flan-t5-small`
- JumpStart model version: `1.3.2`
- SageMaker inference instance type: `ml.g5.2xlarge`

For more details:
- [SageMaker pre-trained Models](https://sagemaker.readthedocs.io/en/stable/doc_utils/pretrainedmodels.html)
- [SageMaker JumpStart Foundation Models - HuggingFace Text2Text Generation](https://sagemaker-examples.readthedocs.io/en/latest/introduction_to_amazon_algorithms/jumpstart-foundation-models/text2text-generation-flan-t5.html)

## Deploy

To deploy this AWS CDK app:

1. Ensure you have the [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) and [Go](https://golang.org/doc/install) installed.
2. Navigate to the directory containing this code.
3. Install necessary dependencies:
    ```
    go mod tidy
    ```
4. Synthesize the CloudFormation template:
    ```
    cdk synth
    ```
5. Deploy the stack:
    ```
    cdk deploy
    ```

This will set up the SageMaker endpoint using the specified JumpStart model.

> Note: Adjust the following parameters to deploy different models or modify configurations:
> `jumpstartModelId`, `jumpstartModelVersion`, `sageMakerInferenceInstanceType`, `endpointName`



## Useful commands

 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `go test`         run unit tests
