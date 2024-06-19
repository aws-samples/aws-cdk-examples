# Fargate Service using EFS
This is a CDK sample that creates a public facing load balanced Fargate service with an EFS Filesystem mount. The intention of this sample is to demonstrate how shared storage can be deployed and utilised that is seperate from your compute, which, in this case is AWS Fargate.

This sample is Is based on this blog post: https://aws.amazon.com/blogs/aws/amazon-ecs-supports-efs/

## Sample overview

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project. The initialization process also creates a virtualenv within this project, stored under the `.env` directory. To create the virtualenv it assumes that there is a `python3` (or `python` for Windows) executable in your path with access to the `venv` package. If for any reason the automatic creation of the virtualenv fails, you can create the virtualenv manually.

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

```
$ pip install -r requirements.txt
```

If you have not deployed with CDK into your account before, you will need to bootsrap the account and environment with

```
$ cdk bootstrap
```

At this point you can now deploy the CloudFormation template for this code.

```
$ cdk deploy
```

## Testing the app
Upon successful deployment, you should see a new Amazon Elastic Container Service cluster deployed with the name "AWS-CDK-Fargate-efssampleCluster<Unique ID>". Similarly you should see an Amazon EFS Volume deployed with the name "AWS-CDK-Fargate-/efs-sample-EFS(<Unique ID>)", and an Application Load Balancer "AWS-CD-efssa--<Unique ID>"
