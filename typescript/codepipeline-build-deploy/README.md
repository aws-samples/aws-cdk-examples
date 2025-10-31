# Building and Deploying a Docker Image With AWS CodePipeline

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

## Overview

This AWS Cloud Development Kit (CDK) TypeScript example demonstrates how to configure AWS CodePipeline with CodeCommit, CodeBuild, and CodeDeploy to build and deploy a Docker image to an Elastic Container Service (ECS) cluster running [AWS Fargate](https://aws.amazon.com/fargate/) (serverless compute for containers).

## Real-world Example

When working in fast-paced development environments, CI/CD (Continuous Integration and Continuous Delivery) pipelines are used to automatically build, test, and deploy application changes across multiple accounts and environments. This allows new features and bug fixes to be tested and deployed quickly to continuously improve the application.

## Requirements

- [TypeScript v3.8+](https://www.typescriptlang.org/)
    - [AWS CDK in TypeScript](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html)
- [AWS CDK v2.x](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)

## AWS Services Utilized

- CodePipeline
- CodeCommit
- CodeBuild
- CodeDeploy
- Elastic Container Service (ECS)
- Fargate
- Elastic Container Registry (ECR)
- Lambda

## Deploying

- Authenticate to an AWS account via a Command Line Interface (CLI).
- Navigate to this `codepipeline-build-deploy` directory.
- `npm install` to install required dependencies
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
- `npm run test` to run the tests we specify in `codepipeline-build-deploy.test.ts`.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Output

After a successful deployment, CDK will output a public endpoint for:

- Application Load Balancer (ALB)

## Working with the Pipeline

After deploying the CI/CD pipeline, you can update your application code and trigger automatic builds and deployments:

### Setting Up Your Local Repository

1. **Navigate to the app directory**:
   ```bash
   cd app
   ```

2. **Add the CodeCommit repository as a remote**:
   ```bash
   # Get the CodeCommit repository URL from AWS Console or CDK output
   git remote add codecommit <codecommit-repository-url>
   ```
   
   Example:
   ```bash
   git remote add codecommit https://git-codecommit.us-east-1.amazonaws.com/v1/repos/ImageBuildDeployRepo
   ```

3. **Configure AWS CodeCommit credentials**:
   - Follow the [AWS CodeCommit HTTPS Git credentials guide](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html)
   - Or use the [git-remote-codecommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html) helper

### Making Changes and Triggering the Pipeline

1. **Modify your application code** in the `app` directory

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Update application"
   ```

3. **Push to CodeCommit**:
   ```bash
   git push codecommit main
   ```

4. **Monitor the pipeline**:
   - Navigate to the [AWS CodePipeline console](https://console.aws.amazon.com/codesuite/codepipeline/pipelines)
   - Select `ImageBuildDeployPipeline`
   - Watch the pipeline automatically:
     - Pull your code from CodeCommit
     - Build the Docker image with CodeBuild
     - Push the image to ECR
     - Deploy to ECS with CodeDeploy

### Alternative: Direct Push to CodeCommit

If you prefer to work directly in a CodeCommit repository:

1. **Clone the CodeCommit repository**:
   ```bash
   git clone <codecommit-repository-url> my-app
   cd my-app
   ```

2. **Copy your application files** to this directory

3. **Commit and push** as shown above

## Testing

- To test that the Docker image was built and deployed successfully to ECS, we can use the Application Load Balancer (ALB) public endpoint, e.g. `http://xyz123.us-east-1.elb.amazonaws.com`.
- The simple containerized application contains multiple pages for testing:
  - `/index.html`
  - `/about.html`
  - `/contact.html`
  - `/error.html`
- Navigate to the AWS CodePipeline console and select `ImageBuildDeployPipeline`. Then click on `Release change` to trigger the pipeline and observe the workflow in action end-to-end.
- Navigate to the AWS Console to view the services that were deployed:
  - CodePipeline pipeline
  - CodeCommit repository
  - CodeBuild project
  - CodeDeploy application
  - ECS cluster
  - ECS service on Fargate
  - ECR image repository
  - Lambda functions

## Further Improvements

- Add [manual approval actions](https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html) to the CodePipeline workflow.
- [Deploy to multiple accounts](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-cross-account.html) with CodeDeploy.
- Set up Elastic Container Registry (ECR) repository [cross-account or cross-region replication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html).
- Protect the public Application Load Balancer (ALB) from attacks and malicious traffic using [Web Application Firewall (WAF)](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html).
- [Enable SSL/TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html) at the Application Load Balancer (ALB) using AWS Certificate Manager.
- Set up a [Route 53 domain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html) to route traffic to an Application Load Balancer (ALB).