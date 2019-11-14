
# WaltersCo URL Shortener

This is the code from the [Infrastructure ***is*** Code with the AWS CDK](https://youtu.be/ZWCvNFUN-sU)  AWS Online Tech Talk
presented on August 20, 2019.

The project is an implementation of a URL shortener service which demonstrates a few AWS CDK concepts:
- [app.py](./app.py) defines the URL shortener service using AWS Constructs for Lambda, API Gateway and DynamoDB.
- The [waltersco_common](./waltersco_common/__init__.py) module includes a base
  CDK stack class that includes APIs for accessing shared resources such as a
  domain name and a VPC.
- [gengen.py](./gengen.py) uses AWS Fargate to create a custom construct for a traffic generator.
- The app uses the [cdk-watchful](https://pypi.org/project/cdk-watchful/) 3rd
  party module which automatically defines a monitoring dashboard and alarms for
  supported resources.

## Setup

Create and source a Python virtualenv on MacOS and Linux, and install python dependencies:

```
$ python3 -m venv .env
$ source .env/bin/activate
$ pip install -r requirements.txt
```

Install the latest version of the AWS CDK CLI:

```shell
$ npm i -g aws-cdk
```

## Shared Infrastructure

One of the ideas this example demonstrates is the concept of shared infrastructure. In this example we show a shared VPC and a shared domain name (and certificate).
We expose these resources through a base `cdk.Stack` class that includes methods for users to interact with:

* The `waltersco_vpc` method returns an `ec2.IVpc` instance which represents the shared VPC.
* The `map_waltersco_subdomain(subdomain, api)` maps a subdomain from the shared
  domain to an API gateway endpoint.

The base class depends on the existence of the following environment variables
to find the shared resources (assumed as already deployed):

```shell
export WALTERSCO_ACCOUNT='1111111111'
export WALTERSCO_REGION='us-east-1'
export WALTERSCO_VPC_ID='vpc-22228723872'
export WALTERSCO_ZONE_NAME='waltersco.co'
export WALTERSCO_ZONE_ID='3333333333'
export WALTERSCO_ZONE_CERT='arn:aws:acm:us-east-1:1111111111:certificate/52e6f78e-c23e-4c83-80cc-d6d1316b644422228723872
```

## Deployment

At this point, you should be able to deploy all the stacks in this app using:

```shell
$ cdk deploy '*'
```
