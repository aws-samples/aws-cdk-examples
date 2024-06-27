
# CDK Example for Service Managed StackSets
<!--BEGIN STABILITY BANNER-->

---

![cdk-constructs: Experimental](https://img.shields.io/badge/cdk--constructs-experimental-important.svg?style=for-the-badge)

> The APIs of higher level constructs in this module are experimental and under active development.
> They are subject to non-backward compatible changes or removal in any future version. These are
> not subject to the [Semantic Versioning](https://semver.org/) model and breaking changes will be
> announced in the release notes. This means that while you may use them, you may need to update
> your source code when upgrading to a newer version of this package.

---

This is a CDK Example for Service Managed StackSets with Python using [cdk-stacksets](https://github.com/cdklabs/cdk-stacksets/tree/main) L2 Construct. This contruct is experimental and under active development.Cloudformation StackSets allow you to deploy a single CloudFormation template across multiple AWS accounts and regions. 

## Overview
This CDK Example allows you to:

* Define a sample resource (my_stack.py) to be deployed across accounts. 

* Read a list of target OUs from a configuration file. (cdk.context.json)

* Create a StackSet that deploys the resource to the specified OUs.

---

## Prerequisites

To set up the required permissions for creating a stack set with service-managed permissions, see [Performing stack set operations involving Regions that are disabled by default](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs.html#stacksets-opt-in-regions) and [Activate trusted access with AWS Organizations](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-activate-trusted-access.html).


---
## About cdk.context.json
The example uses a context file(cdk.context.json) to store list of the OU Ids. This list in the context file can be then passed to the StackSet Construct.

```
{
      "OUIDs": [
        "ou-pv6z-xxxxxxxx",
        "ou-pv6z-aaaaaaaa"
      ]
}
```
You can add multiple OU IDs in the above list. In CDK Code, we are fetching the OU Ids using try_get_context() method as shown:

```
        ou_ids = self.node.try_get_context('OUIDs')
```
---

## Project Structure
* cdk_stackset_python_stack.py: Main CDK stackset definition with L2 Construct
* my_stack.py: Definition of the sample resource to be deployed across accounts and regions.
* cdk.context.json: Configuration file for specifying list of target OUs

---          

## Running the CDK Code

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
