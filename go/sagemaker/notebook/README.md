# SageMaker Notebook Instance

This example creates a new Amazon SageMaker Notebook Instance and the required IAM role.

This project is intended to be sample code only, not for use in production.

This project will create the following in your AWS cloud environment:
- **IAM Role**: to be assumed by the SageMaker notebook instance. It provides the required permissions for the notebook instance, and necessary permissions for assuming roles, logging, etc.
- **SageMaker Notebook Instance**: Creates a SageMaker notebook instance using the specified configuration.

## Setup

The `NotebookStackProps` struct captures additional properties:

- `InstanceType`: Type of the notebook instance.
- `NotebookName`: Custom name for the SageMaker notebook instance.
- `VolumeSizeInGb`: The size of the EBS volume, in GB, that is attached to the notebook instance.

Default Values for this example:
- Region: `us-east-1`
- SageMaker notebook instance type: `ml.t3.medium`
- Volume size in GB: `5`
- Notebook name: `MyNotebook`
- Root access: `Disabled`
- Internet access: `Enabled`

For more details:
- [Amazon SageMaker Notebook Instances](https://docs.aws.amazon.com/sagemaker/latest/dg/nbi.html)
- To see the complete list of options and supported instance types, see [here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sagemaker-notebookinstance.html).

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
5. Deploy the stack (make sure the AWS credentials are configured):
    ```
    cdk deploy
    ```

This will set up the SageMaker notebook instance using the specified configuration.

> Note: Adjust the parameters according to your environment.

## Useful commands

 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `go test`         run unit tests
