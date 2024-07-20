# Welcome to your CDK TypeScript project

<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.
---
<!--END STABILITY BANNER-->

## Overview

This AWS Cloud Development Kit (CDK) TypeScript example demonstrates how to create a fully functional ImageBuilder pipeline that builds an Amazon Linux 2023 container image, installing git, docker and nodejs, all the way to pushing the resulting image to an ECR repository.

## Real-world Example

When working in fast-paced development environments, CI/CD (Continuous Integration and Continuous Delivery) pipelines are used to automatically build, test, and deploy golden images across multiple accounts and environments. This allows new features and bug fixes to be tested and deployed quickly to continuously improve the application.

For example, this pipeline can be used to create the build image that can be used as part of Amazon CodeCatalyst workflow to build applications that require Node version 18 which requires Amazon Linux 2023 and is not currently provided as a built-in image in Amazon CodeCatalyst. Reducing the time needed to bring an Amazon CodeCatalyst workflow up and running.

## Structure

The following resources are created:
- An ECR reposetory to store the built images
- An ImageBuilder recipe that includes the following componenets:
- - install git
- - install nodejs
- - install docker
- instance profile for ImageBuilder build instance
- Infrastructure configuration to tell ImageBuilder which infra to use for the pipeline
- Distribution configuration to tell ImageBuilder to use the ECR repo as the destination for resulting images
- An ImageBuilder pipeline

## Deploying

- Authenticate to an AWS account via a Command Line Interface (CLI).
- Navigate to this `imagebuilder` directory.
- `npm install` to install required dependencies
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
<!-- - `npm run test` to run the tests we specify in `imagebuilder.test.ts`. -->
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.
