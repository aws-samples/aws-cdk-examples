# Serverless-backend for your UI / Frontend example

This is a project to deploy a serverless backend for your current project on AWS with the AWS Cloud Development Kit.



In this example, you can quickly build a serverless backend application with a few lines of python code via Cloud Development Kit (CDK). Depending on the use case, we can send our application's point of entry to make a request and be able to store different types of data (i.g., images or metadata). The stack will deploy: 1) an API Gateway endpoint, to allow the user to send request(s). 2) AWS Lambda to process the request(s). 3) Amazon S3 bucket to store images or files uploaded. 4) DynamoDB table to store your metadata. 5) Cognito User Pool to authenticate your users and secure your API Gateway endpoint. 6) AWS IAM roles with permissions to access different services.


# Stack will deploy the following services: 
- Amazon API Gateway - Entry point for your backend
- AWS Lambda - Process JSON POST request
- Amazon S3 - Bucket to store images or files 
- Amazon DynamoDB - Table for to store metadata
- Amazon Cognito - Secure your backend with User Pool 
- AWS IAM - Creates permissions 


# Prerequisites:

* An active AWS account
* AWS Command Line Interface (AWS CLI) (Install and configure) 
* AWS CDK Toolkit, (Install and configure)
* Postman account or similar tool

# Limitations 

* This example assumes the uploaded image/file has a maximum size of 2MB without compression. (Lambda has a maximum 6MB payload limit.)
* This example assumes the uploaded image/file is in a base64 format. 
* No UI to authenticate user or upload image/file. 


There are no manual steps involved in deploying this stack, however, in this example, Lambda code expects:
1. JSON POST request must have the following keys: 

{   userid : "string"
    photo: "string - base64 format"
    }
2. Requires authenticated API calls. This solution assumes you have a frontend with a login UI, which allows you to configure the deployed Cognito with. If you do not have a UI and would like to test the API invoke URL via the CLI, you can follow the following instructions: 

            - Create Cognito User 

            Once the CloudFormation template is finished deploying, 
            1. Navigate to CloudFormation in the console
            2. Select the deployed stack and navigate to the “Resources” tab
            3. Find the created User Pool by searching AWS::Cognito::UserPool and 4. click on Physical ID for UserPool
            5. Navigate to “Users” and Click “create user”
            6. Complete creating the user and save the username and password for later use
            7. Go to your terminal to run some AWS CLI commands. 

                The password for the new user needs to be permanent. To do so, run the following command (Change the value 
                of user-pool-id to the deployed Cognito User Pool ID. Change the username and password to your created values):

                aws cognito-idp admin-set-user-password \
                --user-pool-id us-east-1_xxxxxx\
                --username usernameExample \
                --password passwordExample \
                --permanent

                Next, the IdToken of the account needs to be retrieved. To do so, run the following command (Change the value 
                of client-id to the deployed Cognito User Pool Client ID. Change the username and password to your created values):
                aws cognito-idp initiate-auth -—region us-east-1Example —-auth-flow USER_PASSWORD_AUTH -—client-id XXXXXXXXXXXXXXXXXX -—auth-parameters USERNAME=usernameExample,PASSWORD=passwordExample

                Note: Ensure the region name matches where the stack was deployed in. 
                For example, if you have deployed your stack in us-east-1, then your region would be "us-east-1"   
                This command will return multiple keys. Save the IdToken for later use

            - Use Postman to test your API endpoint
               
                Note: Postman is developed by a third-party company. It isn't developed or supported by Amazon Web Services (AWS). 
                To learn more about using Postman, or for assistance with issues related to Postman, 
                see the [Support center](https://www.postman.com/support/) on the Postman website.


                1. Navigate to the Resources section of the CloudFormation in the console
                2. Find the created API Gateway by searching AWS::ApiGateway::RestApi and click on Physical ID
                3. Selected “Stages” on the menu on the left, then select “prod.” 4. Save the Invoke URL for later use
                5. Navigate to Postman and create an account
                6. Create a HTTPS Post Request
                7. Select the POST command and paste the API Gateway URL. 
                8. Append “/form” at the end of the URL
                9.Go to Headers and add a key “Authorization” with the value being the saved value IdToken
                10. Go to Body and select raw. Change the blue “Text” setting to “JSON”
                11. In the test area create a request in JSON. Image details must be in base64 format
                {
                    "userid": "myUserID",
                    "photo": "image details"
                }



## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation
