
# Simple Amazon OpenSearch domain

Creates a public OpenSearch domain, but with HTTP access restricted to a specific list of IP addresses. More info on VPC versus public domains [here](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html).


Default user is `admin-user`. Password is generated automatically and stored on [Secrets Manager](https://aws.amazon.com/secrets-manager/).

![OpenSearch](OpenSearch_simple_domain.png)

## Usage
1. Set an environment variable with the list of allowed IP addresses to include your IP. Ex.:
   ```
   export OPENSEARCH_ALLOWED_IP='1.2.3.4/32'
   ```
2. Deploy stack with `cdk deploy`
3. Check stack outputs and retrieve admin password from AWS Secrets Manager. Remember to replace the secret id with the output value from `OpenSearchPasswordSecretName`. E.g.:
    ```
    aws secretsmanager get-secret-value --secret-id OpenSearchDemoDomainAdminUs-HAisfd87ASd
    ```
4. Open the url output in `OpenSearchDashboardsURL` and use `OpenSearchAdminUser` and the above password to log in. 

## Basic usage of CDK 
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
