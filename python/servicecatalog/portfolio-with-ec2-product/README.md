<!--BEGIN STABILITY BANNER-->
---

![Stability: Developer Preview](https://img.shields.io/badge/stability-Developer--Preview-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This example is built on Construct Libraries marked "Developer Preview" and may not be updated for latest breaking changes.
>
> It may additionally requires infrastructure prerequisites that must be created before successful build.
>
> Non-core construct in preview used in this example: `@aws-cdk/aws-servicecatalog-alpha` 
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 
---
<!--END STABILITY BANNER-->

> The construct library for this service is in preview. Since it is not stable yet, it is distributed as a separate package so that 
> you can pin its version independently of the rest of the CDK. See the package:
>
> @aws-cdk/aws-servicecatalog-alpha

# Using Product Stacks with AWS Service Catalog (VPC with EC2 Instance)

This is a CDK example of a [Product Stack](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-servicecatalog.ProductStack.html).

It creates a Service Catalog Portfolio and associated Product containing template for the following resources:
* A VPC
* A public subnet
* A security group
* An EC2 instance in the subnet

Additionally the Portfolio contains:
* A [Launch Constraint](https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-launch.html) on the EC2 instance size
* A [Notification Constraint](https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-notification.html) on stack events

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

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
$ cdk synth
```

## Running Samples
Note these samples are using version 2.X of CDK.

Ensure aws-cdk is installed and [bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```
$ npm install -g aws-cdk
$ cdk bootstrap
```

Build, Synth and Deploy
```
$ npm run build
$ cdk synth
$ cdk deploy
```

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk destroy`     deletes and cleans up the resources our stack provisions
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template