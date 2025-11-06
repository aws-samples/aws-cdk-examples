
# CloudWatch Dashboards for Lambda Functions

This project demonstrates how to setup a CloudWatch Dashboard for Lambda Functions.
CloudWatch dashboards are used to create customized views of the metrics and alarms for your AWS resources.

This CDK sample uses an AWS Lambda Function, as an example, for the source of CloudWatch metrics. This
approach can used with AWS Services that create [CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html) or even [Custom CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html) that you publish yourself.

The following resources are defined in the main CDK Stack:
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)
- [AWS Lambda Function](https://aws.amazon.com/lambda/)

To automatically trigger the Lambda Function we use an
[AWS StepFunctions](https://aws.amazon.com/step-functions/), started after provisioning by a Custom Resource(another Lambda Function).

After deploying the CDK Stacks the StepFunctions state machine will run 20+ minutes to generate sample metrics.

In CloudWatch you see the provisioned dashboard, like the one shown below:

![Sample Dashboard](img/sample_cloudwatch_dashboard.png)

## Setup

This project is set up like a standard Python project.

## Use uv
Create a virtualenv and install all dependencies
```
uv sync
```
At this point you can now synthesize the CloudFormation template for this code.
```
uv run cdk synth
```
Or simple proceed to deployment of the stack.
```
uv run cdk deploy --all
```

### View CloudWatch Dashboard

1) Sign in to the AWS Console
2) Navigate to the URL in this CDK Stack Output: `LambdaCloudwatchDashboardStack.DashboardOutput`
3) Please note, the metrics are aggregated for a period of 5 minutes before being displayed on the Dashboard.  The value of the period can be configured, please see the [CDK documentation](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_cloudwatch/MetricProps.html) for further details.

To clean up, issue this command:
```
uv run cdk destroy --all
```

## Or use the default deployment
To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.
```
cdk synth
```

Or simple proceed to deployment of the stack.
```
cdk deploy
```
## Clean Up
To clean up, issue this command:
```
cdk destroy
```