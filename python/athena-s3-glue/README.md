<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to
> build.

---
<!--END STABILITY BANNER-->

# Auditing logs with _S3_, _Athena_ and _Glue_

This is an example of a CDK program written in Python.\
**Use Case**: a customer wants to store and be able to audit their user logs using common SQL statements.

## Solution Description

To provide the log storage we will deploy an _Amazon S3_ bucket and the auditing capability will be provided by _Amazon
Athena_.

_Athena_ will use the _S3_ bucket as the source for queries that will return specific values given the audit process.

In addition, we will deploy **seven log samples** on the bucket organized by business domain and date to grant _Athena_
high performance and cost efficiency during the queries. An _AWS Glue_ crawler will create the Data Catalog used by
_Athena_, and **three named queries** will be available for testing.

## CDK Toolkit

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


## Deploying the solution

To deploy the solution, we will need to request cdk to deploy the stack:

```shell
$ cdk deploy --all
```

Now that we have the infrastructure created, you will need to populate the Glue Database. Do that by going to the AWS
console, _AWS Glue_, _Data Catalog_, _Crawlers_.

Select `logs-crawler` and hit the button *Run*. When it finishes, you will be ready to test the solution.


## Testing the solution

1. Head to _AWS_ console and then to _Amazon Athena_
2. On the left panel, go to **Query editor**
3. Change the **Workgroup** selection to `log-auditing`
4. On **Data source**, choose `AwsDataCatalog`
5. On **Database**, choose `log-database`
6. Two tables will be displayed on the **Tables** section. Expand both and their fields will be displayed
7. You can now start writing your queries on the right panel and then clicking **Run** to perform the query against the
   database.
8. Optionally you can go to the **Saved queries** and select one to open on the **Editor** panel, helping you format the
   query.

> **Tip**: you can explore the `auditing-logs` bucket and check all the log files inside it. If you want to add other
> logs to perform more complex tests, follow the directory structure and if needed to add another directory, make sure
> you run the respective _Glue Crawler_ in order to update the partitions.


## Destroying the deployment

To destroy the provisioned infrastructure, you can simply run the following command:

```shell
$ cdk destroy --all
```

## Running Unit Tests
To invoke Unit Tests (from the root project folder)
```
pytest
```

If you want to invoke a specific unit test file, just pass the filename as a parameter. (wildcards also work, e.g. `pytest tests/unit/*_stack*`).
```
pytest tests/unit/<test_filename>
```
