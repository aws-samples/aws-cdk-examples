
# Local Zone: Getting started with CDK

This is a project that demonstrates how to deploy resources in a AWS Local Zone.

## Overview 

![alt text](./architecture.png "AWS Local Zone with CDK")

The generated stack creates a new Amazon VPC with a public and a private subnet associated with the specified Local Zone. 
To allow resources in the private subnet to initiate traffic towards the Internet, it deploys an EC2 instance of type T3 Medium that acts as a NAT instance. The reason why a self managed NAT instance is used is because currently NAT Gateway is not supported in Local Zone. 

The NAT instance is configured following the best practices described in https://docs.aws.amazon.com/vpc/latest/userguide/VPC_NAT_Instance.html#basics . The route table of the private instance is automatically configured to have a default route pointing to the NAT instance in the public subnet.

In addition, the script deploys a simple WordPress installation with the front-end installed in the public subnet while the back-end, a MySQL database, installed in a EC2 in the private subnet. 

## Usage

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

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
