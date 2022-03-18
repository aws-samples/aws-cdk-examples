# Create Custom Database with AWS Cloud Development Kit

After creating database instances, database administrators often need to create and configure databases to meet their organization's needs. They may need to create databases, roles, and permissions standardized across the organization. AWS Cloud Development Kit (AWS CDK) allows you to define databases in AWS Cloud using familiar programming languages. The `CustomResource` construct in AWS CDK enables you to further customize the databases with configurations not natively available in AWS CDK or AWS CloudFormation.

This sample AWS CDK project demonstrates using custom resource to create a database in a RDS instance. This project creates a RDS MySQL database instance in a virtual private cloud (VPC). It also creates a custom resource backed by AWS Lambda to create, rename, and delete a database in the MySQL database instance.

Two options are available to configure the custom resource during deployment. See instruction #5 for usage example.

- `databaseName`: database name for the MySQL database instance. _(default is `MyCustomDatabase`)_
- `verbose`: set to `true` to print detailed log messages in the custom resource Lambda function. _(default is `false`)_
- `rdsPubliclyAccessible`: set to `true` to set the RDS database instance to be publicly accessible. _(default is `false`)_

## Pre-requisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured
- [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_install) installed, configured, and bootstrapped
- [Python3](https://www.python.org/downloads/) installed with access to the `venv` package
- [Docker](https://www.docker.com/) installed and running

## Instructions

1. Create a virtualenv.

```
$ python3 -m venv .venv
```

2. Activate your virtualenv.

```
// On MacOS and Linux:
$ source .venv/bin/activate

// On Windows:
% .venv\Scripts\activate.bat
```

3. Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

4. At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

5. And deploy to your AWS account.

```
// with default options
$ cdk deploy --all

// with custom options
$ cdk deploy --all --context databaseName=MyCustomDatabase --context verbose=true --context rdsPubliclyAccessible=true
```

6. To clean up the resources in your AWS account.

```
$ cdk destroy --all
```
