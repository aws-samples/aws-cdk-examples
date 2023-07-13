
# API Gateway with multiple stages + Lambda Aliases

Creates an API Gateway API with 3 deployment stages. Each deployment stage corresponds to a Lambda function alias. This sample uses API Gateway stage variables to dynamically configure the correct Lambda Alias integration for the API method.

This is a blank project for CDK development with Python.

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

## Testing the app

Upon successful deployment, there will be an API Gateway REST API and AWS Lambda function deployed in your account. To test the API for the different stages, we've provided a test script that will validate each stage corresponds to the correct Lambda Alias. To run the test, you must have AWS Credentials to invoke an API Gateway.

Run the following to install the required development libraries:
```
pip install -r requirements-dev.txt
```

Retrieve the `ApiHostUrl` output value from your `cdk deploy` command. If you cleared your terminal, you can retrieve this value from the AWS CloudFormation console --> Outputs tab of your stack.

Execute the following command to run the test script:
```
pytest -s tests/api_driver.py --apiurl <INSERT API HOST URL HERE>
```

You should see 3/3 tests passed which means the stack deployed correctly and the API Gateway stages correspond to the correct Lambda Alias.
