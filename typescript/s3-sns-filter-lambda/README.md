# S3, SNS, Lambda Integration

This AWS CDK configuration sets up an automated workflow to trigger a specific Lambda
function based on the prefix of files uploaded to Amazon S3. Using the SNS service
with a filter policy, it directs events to the appropriate Lambda function
efficiently.

## Get Started

1. Install AWS CDK and Bootstrap Your AWS Account in a Specific Region

   ```
   npm install -g aws-cdk
   cdk bootstrap
   ```

2. Create a `.env` File with Your AWS Account ID

   ```
   AWS_ACCOUNT_ID=YOUR_ACCOUNT_ID
   ```

3. Install Dependencies

   1. Run the following command in the project root to install all dependencies:

      ```
      yarn
      ```

   2. Then navigate to the functions folder to install the required node modules for
      Lambda functions:
      ```
      cd ./functions yarn
      ```

4. Deploy to AWS

   - Use this command to deploy all stacks to AWS:

     ```
     cdk deploy --all
     ```

## Try it out

After running the above commands, an S3 bucket will be created. Upload a file to one
of the designated folders (e.g., folder1 or folder2). Depending on the folder, the
corresponding Lambda function (e.g., lambda1 or lambda2) will be triggered
automatically.
