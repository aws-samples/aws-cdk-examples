# CDK Python CodePipeline Example
* This is an example of a CodePipeline project that uses CodeBuild to Build a Docker Image and push to ECR.
* This example uses multiple stacks for the purpose of demonstrating ways of passing in objects from different stacks
* push.sh will trigger the pipeline via an S3 Upload. 
* Parameter Store is used to store the value of the Pipeline and S3 Bucket so it can be retrieved later in push.sh. 
* Parameter Store can be replaced with CloudFormation Outputs or Exports