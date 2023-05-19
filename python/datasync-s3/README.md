
# Welcome to your CDK Python project!

This repo uses the AWS CDK to enable Data movement among S3 buckets using AWS Datasync service. This example will support use-cases such as backups, bucket consolidation, data lake creations and so on.

This CDK example application creates the following resources.
- New S3 buckets (Optional)
- One or more DataSync S3 locations 
- IAM Role and policy for the DataSync service to read/write to S3 buckets
- DataSync task(s) to synchronize content between source and destination bucket pairs

When you run `cdk deploy`, the CDK application creates two CloudFormation Stacks.
1. `cdk-datasync-s3-to-s3-iam` - creates necessary IAM Roles. This Stack is implemented in [datasync_s3_to_s3_IAM_stack.py](datasync_s3_to_s3/datasync_s3_to_s3_IAM_stack.py)
2. `cdk-datasync-s3-to-s3` - creates S3 buckets. This Stack is implemented in [datasync_s3_to_s3_stack.py](datasync_s3_to_s3/datasync_s3_to_s3_stack.py)


## Steps to use
1. Follow steps for intializing the CDK environment below. Ensure that Virtual Env is activated. See **Configuring Virtual Env**.
2. Ensure that you have exported AWS credentials, IAM profile, or EC2 instance role with Permissions to create IAM Role and DataSync resources. 
3. Add the source and destination bucket names in `cdk.context.json`, and define one or more Datasync tasks to move data between source and destination pairs. See **Setting CDK Context**.
4. From the directory where `cdk.json` is present, run the `cdk diff` command. Adjust `app.py` if needed.
5. Run `cdk deploy --all` to create the resources. The Task outputs will be shown upon successful deployment.
6. Start the DataSync task using AWS CLI: `aws datasync start-task-execution --task-arn <task-arn>` 


## Cleanup
1. Follow the above steps 1 through 3.
2. Run `cdk destroy --all` to delete previously created Stacks. 


## Setting CDK Context
This CDK application operates on two input lists, one for DataSync locations another for DataSync tasks. Each list can be populated with any number of configuration items. Below is an example of copying content from an existing source bucket to a new destination bucket. 
```
{
  "S3_datasync_locations": [
    {
      "bucketName": "cdk-example-datasync-source-bucket",
      "create": true,
      "storage_lass": "STANDARD",
      "subDirectory": "",
      "tags": [
        {
          "key": "Project",
          "value": "CDK-example"
        }
      ]
    },
    {
      "create": true,
      "bucketName": "cdk-example-datasync-destination-bucket",
      "storageClass": "STANDARD",
      "subDirectory": "",
      "tags": []
    }
  ],
  "S3_datasync_tasks": [
    {
      "source": "cdk-example-datasync-source-bucket",
      "destination": "cdk-example-datasync-destination-bucket"
    }
  ]
}

```

Below are the configuration elements.

| Key | Description | Example |
| S3_datasync_locations | List containing S3 location configurations | |
| bucketName | List containing S3 location object configurations | |
| create | List containing S3 location object configurations | |
| storage_lass | List containing S3 location object configurations | |
| subDirectory | List containing S3 location object configurations | |
| tags | |
| S3_datasync_tasks | List containing S3 Datasync task configurations | |
| source | Source S3 bucket name for DataSync task | |
| destination | Destination S3 bucket name for DataSync task | |

## Configuring Virtual Env
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

Enjoy!
