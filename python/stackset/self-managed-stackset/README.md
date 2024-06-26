
# CDK Example for Self-Managed StackSets
<!--BEGIN STABILITY BANNER-->

---

![cdk-constructs: Experimental](https://img.shields.io/badge/cdk--constructs-experimental-important.svg?style=for-the-badge)

> The APIs of higher level constructs in this module are experimental and under active development.
> They are subject to non-backward compatible changes or removal in any future version. These are
> not subject to the [Semantic Versioning](https://semver.org/) model and breaking changes will be
> announced in the release notes. This means that while you may use them, you may need to update
> your source code when upgrading to a newer version of this package.

---

This is a CDK Example for Self-Managed StackSets with Python using [cdk-stacksets](https://github.com/cdklabs/cdk-stacksets/tree/main) L2 Construct. This contruct is experimental and under active development.

Cloudformation StackSets allow you to deploy a single CloudFormation template across multiple AWS accounts and regions. 

The example uses a context file(cdk.context.json) to store the deployment target in the form of list of OU Ids and Account IDs. This list in the context file can be then passed to the StackSet Construct.

## Prerequisites
Before you create a stack set with self-managed permissions, you must have created [IAM service roles](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html#prereqs-self-managed-permissions) in each account:

 Create IAM Service Roles: Create the necessary IAM service roles in your administrator and target accounts to define the desired permissions. Specifically, the two required roles are:
   - `AWSCloudFormationStackSetAdministrationRole` – This role is deployed to the administrator account.
   - `AWSCloudFormationStackSetExecutionRole` – This role is deployed to all accounts where you create stack instances.

The example create "AWSCloudFormationStackSetAdministrationRole" with a DefaultPolicy allowing AWSCloudFormationStackSetExecutionRole in the target accounts to assume it. The following depepdency has been added to make sure that the role and policy is created before the stackset deployment:

```
self_managed_stackset.node.add_dependency(admin_role.node.find_child("DefaultPolicy"))

```
## About cdk.context.json

```
{
      "ACCOUNTS":[
        "12345XXXXXXX",
        "67890XXXXXXX"
      ]
}
```
For self-managed stackset, we can provide deployment target as a list of Account Ids in a context file like above. The self-managed stackset created by the example would create stack instances in the accounts mentioned in this context file. 

In CDK Code, we are fetching the Account Ids using try_get_context() method as shown:

```
        ou_ids = self.node.try_get_context('ACCOUNTS')
```

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
