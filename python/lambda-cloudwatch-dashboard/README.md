
# CloudWatch Dashboards for Lambda Functions

This project demonstrates how to setup a CloudWatch Dashboard for Lambda Functions.
CloudWatch dashboards are used to create customized views of the metrics and alarms for your AWS resources.

This CDK sample uses an AWS Lambda Function, as an example, for the source of CloudWatch metrics. This 
approach can used with AWS Services that create [CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html) or even [Custom CloudWatch metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html) that you publish yourself.

The following resources are defined in the CDK Stack:
- [AWS Lambda Function](https://aws.amazon.com/lambda/)
- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)

After deploying solution, you will have created a CloudWatch Dashboard, like the one shown below:

![Sample Dashboard](img/sample_cloudwatch_dashboard.png)

---
### Requirements:

- git
- npm (node.js)
- python 3.x
- AWS access key & secret for AWS user with permissions to create resources listed above

---

## Setup

First, you will need to install the AWS CDK:

```
sudo npm install -g aws-cdk
```

You can check the toolkit version with this command:

```
cdk --version
```

Next, you will want to create a project directory:

```
mkdir ~/cdk-samples
```

To manually create a virtualenv on MacOS and Linux:

```
cd ~/cdk-samples
python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
.venv\Scripts\activate.bat
```

Now you're ready to clone this repo and change to this sample directory:

```
git clone https://github.com/aws-samples/aws-cdk-examples.git
cd aws-cdk-examples/python/lambda-cloudwatch-dashboard
```

Install the required dependencies:
```
pip install -r requirements.txt
```

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.

## Deployment

At this point you can now synthesize the CloudFormation template for this code.
```
cdk synth
```

Or simple proceed to deployment of the stack.
```
cdk deploy
```

## Test

### Invoke Lambda Function
In order to generate some metrics, you can invoke the sample Lambda Function:

Replace `<NAME_OF_FUNCTION>` with the value of this CDK Stack Output: `LambdaCloudwatchDashboardStack.LambdaName`
```
aws lambda invoke --function-name <NAME_OF_FUNCTION> text_output.txt
```

### View CloudWatch Dashboard

1) Sign into to the AWS Console
2) Navigate to the URL in this CDK Stack Output: `LambdaCloudwatchDashboardStack.DashboardOutput`
3) Please note, the metrics are aggregated for a period of 5 minutes before being displayed on the Dashboard.  The value of the period can be configured, please see the [CDK documentation](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_cloudwatch/MetricProps.html) for further details.


## Clean Up
To clean up, issue this command:
```
cdk destroy
```

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
