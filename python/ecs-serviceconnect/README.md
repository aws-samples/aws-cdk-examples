
# Welcome to your CDK Python project!

This is a CDK example showcasing ECS Service Connect. ECS Service Connect was released in 2022 and provides customers a way to build seamless communication between microservices. This example showcases a simple frontend container that can be accessed via an ALB URL. When the endpoint is hit it will call the backend container to retrieve data @ data.scapp.local:5001.


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


To deploy this stack run `cdk deploy --all`

You can then see how the two containers by running `curl <ALB_ENDPOINT>/get-data`, which will return an array from the backend service at its local domain.

Enjoy!
