# lambda-ddb-mysql-etl-pipeline
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples does is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This is a CDK Python ETL Pipeline example that produces the AWS resources necessary to achieve the following: 
1) Dynamically deploy CDK apps to different environments.
2) Make an API Request to a NASA asteroid API.
3) Process and write response content to both .csv and .json files.
4) Upload the files to s3.
5) Trigger an s3 event for object retrieval post-put s3 object.
6) Process then dynamically write to either DynamoDB or a MySQL instance. 
*The `__doc__` strings are verbose (overly). Please read them carefully as exceptions 
and considerations have been included, to provide a more comprehensive example. 

**Please don't forget to read the 'Important Notes' section at the bottom of this README.
I've also included additional links to useful documentation there as well.

## Project Directory Rundown
`README.md` — The introductory README for this project.

`etl_pipeline_cdk` — A Python module directory containing the core stack code.

`etl_pipeline_cdk_stack.py` — A custom CDK stack construct that is the core of the CDK application. 
It is where we bring the core stack components together before synthesizing our Cloudformation template.

`requirements.txt` — Pip uses this file to install all of the dependencies for this CDK app. 
In this case, it contains only '-e', which tells pip to install the requirements 
specified in `setup.py`--I have all requirements listed. 
It also tells pip to run python `setup.py` develop to install the code in the `etl_pipeline_cdk` module so that it can be edited in place.

`setup.py` — Defines how this Python package would be constructed and what the dependencies are.

`lambda` — Contains all lambda handler code in the example. See `__doc__` strings for specifics. 

`layers` — Contains the requests layer archive, created for this project. 

## Pre-requisites
#### Keys, Copy & Paste
1) Submit a request for a NASA API key here (it comes quick!): https://api.nasa.gov/
2) Navigate to the `etl_pipeline_cdk_stack.py` file and replace this text `<nasa_key_here>`
with your NASA key that was emailed to you.** 
3) Navigate to the `app.py` file and replace this text `<acct_id>` with your AWS account id 
and `<region_id>` with the region you plan to work in--e.g. `us-west-2` for Oregon and `us-east-1` for N. Virginia.
4) Via macOS cli, run this command to set `preprod` env variable: `export AWS_CDK_ENV=preprod`

**Yes, this is not best practice. We should be using Secrets Manager to store these keys. 
I have included the required code to extract those along with some commented notes in my sample of how this is achieved. 
Just haven't the time to "plug them in" at the moment--plus it makes this a bit easier to follow.

## AWS Instructions for env setup
This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the .env
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .env
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .env/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .env\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.
**I've listed all required dependencies in setup.py, thus the `-e`. 

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

# Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

# Important Notes:
Destroying Resources:

After you are finished with this app, you can run `cdk destroy` to quickly remove the majority 
of the stack's resources. However, some resources will NOT automatically be destroyed and require
some manual intervention. Here is a list directions of what you must do:
1) S3 bucket: You must first delete all files in bucket. Changes to the current policy which forbid
bucket deletion, if files are present are in development and can be found here: https://github.com/aws/aws-cdk/issues/3297
2) CloudWatch Log Groups for lambda logging. Found on filter: `/aws/lambda/Etl`
3) s3 CDK folder with your CloudFormation templates. Delete at your discretion. 
4) Your bootstrap stack asset s3 folder will have some assets in there. Delete/save at your discretion. 
**Don't delete the bootstrap stack, nor the s3 asset bucket, if you plan to continue using CDK.
5) Both lambdas are set to run in `logging.DEBUG`, switch if too verbose. See CloudWatch logs for logs. 
