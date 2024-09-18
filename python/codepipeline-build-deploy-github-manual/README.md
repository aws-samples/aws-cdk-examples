# Building and Deploying a Docker Image With AWS CodePipeline

## <!--BEGIN STABILITY BANNER-->

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This example is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---

<!--END STABILITY BANNER-->

## Overview

This AWS Cloud Development Kit (CDK) Python example demonstrates how to configure AWS CodePipeline with GitHub, CodeBuild, and CodeDeploy to build and deploy a Docker image to an Elastic Container Service (ECS) cluster running AWS Fargate (serverless compute for containers). The pipeline sources code from a manually created GitHub repository, builds it using CodeBuild, and deploys the resulting Docker image to ECS Fargate using CodeDeploy.


## Real-world Example

When working in fast-paced development environments, CI/CD (Continuous Integration and Continuous Delivery) pipelines are used to automatically build, test, and deploy application changes across multiple accounts and environments. This allows new features and bug fixes to be tested and deployed quickly to continuously improve the application.

## Prerequisites

1. [Python v3.6+](https://www.python.org/)
2. [AWS CDK in Python](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-python.html)
3. [AWS CDK v2.x](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
4. GitHub Account
    -   Create [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classicion/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)(PAT), for testing purposes you can select the `repo` permission to grant full access to the repositories.
    - [Authenticate to an AWS account](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new-command) via a Command Line Interface (CLI) and store the GitHub PAT created above to AWS Secrets Manager using AWS CLI (This secret will be used by CodePipeline to authenticate with GitHub):
    ```        
    $ GITHUB_ACCESS_TOKEN='your Github access token'
    $ REGION=us-east-1
    $ aws secretsmanager create-secret --name github-access-token-secret --description "Github access token" --secret-string $GITHUB_ACCESS_TOKEN --region $REGION
    ```

5. Prepare your Github repository
  - Create a new [GitHub repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories).
  - Clone the repository to your local machine.
  - Copy all files and directories from the 'app/' directory of this project into the root of your cloned GitHub repository. After copying, your GitHub repository should have the following structure:
```sh   
.
├── Dockerfile
├── README.md
├── appspec.yaml
├── buildspec.yaml
├── site-assets
│   ├── about.html
│   ├── contact.html
│   ├── error.html
│   ├── index.html
│   └── styles.css
└── taskdef.json

2 directories, 10 files
```




## AWS Services Utilized

- CodePipeline
- CodeBuild
- CodeDeploy
- Elastic Container Service (ECS)
- Fargate
- Elastic Container Registry (ECR)
- Lambda

## Deploying

- Navigate to this `codepipeline-build-deploy-github-manual` directory.
- Update the GitHub username and repository name in the file:
`codepipeline_build_deploy/codepipeline_build_deploy_stack.py`
Look for the following lines and replace them with your GitHub information (Note: there are **two pairs** of `github_user` and `repo_name` to update in line 45 AND line 206):
```python
owner='github_user',    # TODO: Replace with your GitHub username
repo='repo_name',   # TODO: Replace with your GitHub repository name
```

- `pip install -r requirements.txt` to install the required dependencies.
- `cdk synth` to generate and review the CloudFormation template.
- `cdk diff` to compare local changes with what is currently deployed.
- `pytest` to run the unit tests we specify in `tests/unit/test_codepipeline_build_deploy_stack.py`.
- `cdk deploy` to deploy the stack to the AWS account you're authenticated to.

## Output

After a successful deployment, CDK will output a public endpoint for:

- Application Load Balancer (ALB)

## Testing

- To test that the Docker image was built and deployed successfully to ECS, we can use the Application Load Balancer (ALB) public endpoint, e.g. `http://xyz123.us-east-1.elb.amazonaws.com`.
- The simple containerized application contains multiple pages for testing:
  - `/index.html`
  - `/about.html`
  - `/contact.html`
  - `/error.html`
- To run the Python unit tests, execute the following commands:
  - `pip install -r requirements-dev.txt`
  - `pytest`
- Navigate to the AWS CodePipeline console and select `ImageBuildDeployPipeline`. Then click on `Release change` to trigger the pipeline and observe the workflow in action end-to-end.
- Navigate to the AWS Console to view the services that were deployed:
  - CodePipeline pipeline
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
