## :rocket: Feature Request

### General Information
<!--
Check the box below (with an X) if you are able and willing to propose an
implementation for the requested feature. This does not imply a commitment from
you to actually do it!
-->
* [x] :wave: I may be able to implement this feature request
<!--
Check the box below (with an X) if you think this feature might result in a
breaking change (this requiring a major version bump when released). If unsure,
please leave the box un-checked.
-->
* [ ] :warning: This feature might incur a breaking change 

### Description
This example shows how you automate attaching an alarm to an ec2 instance at launch time, then when the alarm is triggered how it can create an systems manager opsitem with an associated run book.   


### Proposed Solution
<!--
Whenever relevant, describe how you would like the feature to be implemented.
Include any documentation that can help understand your idea in very concrete
ways, such as code examples that leverage your feature, captures of design
diagrams, ...
-->

### Environment

  - **CDK CLI Version:** 1.121.0 
  - **Example:** Automate EC2 alarm creation that triggers an OpsItem when in "ALARM" state
  - **Example Version:** 1.0
  - **OS:** Amazon Linux 2
  - **Language:** Python


### Other information 
The cdk stack creates the below resources:
 - **Language:** Python

AWS::IAM::Role
AWS::IAM::Policy
AWS::IAM::Role
AWS::IAM::Policy
AWS::SNS::Topic
AWS::SNS::Subscription
AWS::IAM::InstanceProfile
AWS::EC2::Instance
AWS::Lambda::Function
AWS::EC2::SecurityGroup
AWS::Lambda::Function
AWS::Events::Rule
AWS::Lambda::Permission
AWS::Lambda::Permission
AWS::Events::Rule
AWS::SSM::Document


# Welcome to your CDK Python project!

This is a blank project for Python development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python -m venv .venv
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

If there are no errors you can now deploy the stack.

```
$ cdk deploy --parameters emailparam=myemail@email.com

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
