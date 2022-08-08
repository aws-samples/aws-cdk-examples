
# Welcome to your CDK Python project!

This is cdk example project for CDK development with Python.

The project provides a solution that I already suggested for the issues reported from aws-cdk issues about using IPAM pool id in the ec2.vpc L2 construct : 
https://github.com/aws/aws-cdk/issues/21333

The deployement provides a VPC with 2 subnets ( private and public ) on each availability zone ( you could customize your VPC by modifying the vpc_stack.py code  ) 
The Ipam_stack have a cidr_range for the top level ipam pool as "11.0.0.0/8" and "11.0.0.0/12" for the region ipam pool you can modify the two variable in app.py

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
 * `cdk deploy "*" --require-approval never --outputs-file ./cdk-exports.json`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
 * `cat cdk-exports.json | grep ipamid | cut -d\" -f4 | tr -d "\n" > ipamdelid`    to destroy the ipam without wainting for release
 * `aws ec2 delete-ipam --cascade --ipam-id $(<ipamdelid)`        to destroy the ipam without wainting for release
 * `cdk destroy "*"`        to destroy all the stacks

Enjoy!
