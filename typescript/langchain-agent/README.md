# AI Agents With Langchain, OpenAI’s GPT-4, and AWS

## Requirements

- [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and log in. The IAM user that you use must have sufficient permissions to make necessary AWS service calls and manage AWS resources.
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed and configured
- [Git Installed](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [AWS Cloud Development Kit](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) (AWS CDK) v2 Installed
- [NodeJS and NPM](https://nodejs.org/en/download/) Installed
- [Python](https://www.python.org/downloads/) Installed
- [OpenAI API Key](https://platform.openai.com/account/api-keys)
- [Amplify CLI](https://docs.amplify.aws/cli/start/install/) installed and configured

## Architecture Overview
![Alt text](./architecture_diagram.png?raw=true "Architecture")

## Deployment Instructions

1. Create a new directory, navigate to that directory in a terminal and clone the repository:

```
mkdir serverless-conversational-ai && cd serverless-conversational-ai
git clone git@ssh.gitlab.aws.dev:serverless-conversational-ai/main.git
```

2. Change directory to the backend directory and unzip the Langchain Lambda layer:

```
cd back
unzip layers/langchain-layer.zip -d layers/langchain-layer
rm layers/langchain-layer.zip
```

3. Install the project dependencies:

```
npm install
```

4. Export the OpenAI API Key to store it in AWS SSM Parameter Store:

```
export OPENAI_API_KEY=<your-openai-api-key>
```

5. The Cognito User Pool Domain must be unique. You can either go to the lib/ai-stack.ts and manually change the name or, if you are on a Mac, run the command below.

```
timestamp=$(date +%Y%m%d%H%M%S)
sed -i '' "s/ai-domain/ai-domain-$timestamp/" lib/ai-stack.ts
```

Note: The first time you deploy an AWS CDK app into an environment (account/region), you’ll need to install a “bootstrap stack”. This stack includes resources that are needed for the toolkit’s operation.
Use the following command to install the bootstrap stack into the environment:

```
npx cdk bootstrap
```

6. Use AWS CDK to synthesize an AWS CloudFormation:

```
npx cdk synth
```

7. Use AWS CDK to deploy the AWS resources for the pattern:

```
npx cdk deploy
```

During the deployment you will be asked to confirm the security-sensitive changes. Review it and enter y to deploy the stack and create the resources.

8. Save the following from the outputted values:

   a. UserPoolClientIdWeb.

   b. UserPoolId.

   c. FunctionUrl.

9. Navigate back to the root directory and change directory to the frontend directory:

```
cd ..
cd front
```

10. Install the project dependencies:

```
npm install
```

11. Configure a new AWS Amplify project:

```
amplify init
```

(Optional) If you are running into errors run:

```
amplify configure
```

12. Import your existing auth resource to your local back-end

```
amplify import auth
```

Select the "Cognito User Pool and Identity Pool" option and select the values you saved previously.

13. Provision cloud back-end resources with the latest local changes:

```
amplify push
```

Create .env.local file to store environmental variable and replace the variables with the Lambda Function URL and corresponding AWS Region:

```
echo "NEXT_PUBLIC_LAMBDA_URL=<your-lambda-url>" > .env.local
echo "NEXT_PUBLIC_AWS_REGION=<your-aws-region>" >> .env.local
```

Run application:

```
npm run dev
```

## Cleanup

1. To remove the Amplify auth, run:

```
amplify remove auth
```

2. To delete the Amplify project and associated backend resources, run:

```
amplify delete
```

3. To delete the stack, run:

```
npx cdk destroy
```

## Useful commands

- `cdk ls` list all stacks in the app
- `cdk synth` emits the synthesized CloudFormation template
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk docs` open CDK documentation
