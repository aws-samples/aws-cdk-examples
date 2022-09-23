### Description
This example shows how you can use the cdk to automate attaching an alarm to an ec2 instance at launch time, then when the alarm is triggered how it can create an systems manager opsitem with an associated run book.   


### Proposed Solution

![Koi-Demo-Architecture](https://user-images.githubusercontent.com/70331690/132078565-c8da7a48-7701-48c7-a9c6-a98c42a6dfed.png)


The workflow of this solution is as follows:  When an EC2 instance is launched it will trigger an Eventbridge rule that kicks off a lambda function.  The lambda function determines if the EC2 instance already has a matching alarm.  If it does **not** then it will create and attach a "StatusCheckFailed" metric alarm and tag the instance so next time it is launched it will skip the Alarm creation logic.  

The solution also deploys an SSM automation run command document that can be used to easily trigger the alarm via a bash 
shell script that executes the **set-alarm-state** aws cli command.  

Once the alarm is triggered another Eventbridge rule will kick-off the second lambda function that creates an SSM OpsItem with an associated runbook.  

**Clean-up:** cdk destroy then delete any Alarms that were created 

### Environment

  - **CDK CLI Version:** 2.42.x 
  - **Example:** Automate EC2 alarm creation that triggers an OpsItem when in "ALARM" state
  - **Example Version:** 2.0
  - **OS:** Amazon Linux 2
  - **Language:** Python


### Other information 
The cdk stack deploys the following resources:
 - IAM Policies and Roles
 - IAM Instance Profile
 - EC2 Instance
 - SNS Topic and Subscription
 - Lambda Functions (Two)
 - Eventbridge Rules (Two)
 - SSM Document

# General information on how to execute this sample

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
