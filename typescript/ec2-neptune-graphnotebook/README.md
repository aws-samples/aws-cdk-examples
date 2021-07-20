## ec2GraphNotebook

## Description
This cdk project will provision a VPC, a Neptune cluster, an ALB, and an EC2 instance. The EC2 instance will have a UserData script to install JupyterHub, graph-notebook and other related components. The ALB will direct the user to Cognito for authentication before forwarding to EC2/JupyterHub.

# Requirements
* CDK. This project uses the AWS CDK to deploy. To use the CDK:
    - Bootstrap the cdk with `cdk bootstrap <accountnumber>/<region>`
    - Create the dir 'ec2_graph_notebook' and `cd` into it
    - Initialize the app with `cdk init app --language typescript`
    - Copy 'ec_graph_notebook-stack.ts' to lib/ (overwriting the file that's there)
    - Copy the rest of the files to root directory (overwriting package.json)
    - Run `npm install`
* S3 bucket to house the authenticator and user-data.sh script
* Cognito User Pool
    - The User Pool will need an App Client configured with Authorization Code Grant and openid.
    - The App integration will require a domain name (ie: yourcooldomainprefix..auth.us-east-1.amazoncognito.com)
    - Once `cdk deploy` has run, you need to add the ALB URL to the Callback URL's field in the form of ${callbackUrl}/oauth2/idpresponse
* Certificate in ACM for the ALB

# Issues
* Only supports Amazon Linux 2
* Requires an S3 bucket to host JupyterHub authenticator and user-data.sh script
* Requires an existing certificate in ACM
* Requires an existing Cognito User Pool
* EC2 Security Group needs to be tightened

# Usage
1) Upload the below files to an S3 bucket:
    - jwtvalidation_authenticator-0.0.37-py3-none-any.whl
    - user-data.sh
2) Set the following environment variables:
    - S3BUCKETNAME // Thisis the bucket you uploaded the earlier files to
    - CERTIFICATEARN // This is the ARN of a certificate in ACM that can be attached to the ALB listener
    - JHUSERNAME // This is the username you want to use to login to JupyterHub and should exist in your Cognito User Pool
    - COGUSERPOOLARN // This is your Cognito User Pool ARN
    - COGUSERPOOLID // This is the Id of the App Client configured in Cognito
    - COGDOMAIN // This is the domain of the App Client configured in Cognito
3) Configure the user-data.sh script. There are three variables that need values.
4) Assume a session for your AWS account
5) Run `cdk deploy`
6) Update the Cognito User Pool callback URL with "https://${ALB_URL}/oauth2/idpresponse"
7) Get the ALB URL and use it to login into JupyterHub. This should spawn a graph notebook instance.