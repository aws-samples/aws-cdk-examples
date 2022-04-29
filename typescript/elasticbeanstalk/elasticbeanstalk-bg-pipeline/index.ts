import cdk = require('aws-cdk-lib');
import cpactions = require('aws-cdk-lib/aws-codepipeline-actions');
import cp = require('aws-cdk-lib/aws-codepipeline');
import cc = require('aws-cdk-lib/aws-codecommit');
import lambda = require('aws-cdk-lib/aws-lambda');
import s3 = require('aws-cdk-lib/aws-s3');

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //objects for access parameters
    const node = this.node;

    const blue_env = node.tryGetContext("blue_env");
    const green_env = node.tryGetContext("green_env");
    const app_name = node.tryGetContext("app_name");

    const bucket = new s3.Bucket(this, 'BlueGreenBucket', {
      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const handler = new lambda.Function(this, 'BlueGreenLambda', {
      runtime: lambda.Runtime.PYTHON_3_6,
      code: lambda.Code.fromAsset('resources'),
      handler: 'blue_green.lambda_handler',
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    bucket.grantReadWrite(handler);

    const repo = new cc.Repository(this, 'Repository', {
      repositoryName: 'MyRepositoryName',
    });

    const pipeline = new cp.Pipeline(this, 'MyFirstPipeline');

    const sourceStage = pipeline.addStage({
      stageName: 'Source'
    });

    const sourceArtifact = new cp.Artifact('Source');

    const sourceAction = new cpactions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: repo,
      output: sourceArtifact,
    });

    sourceStage.addAction(sourceAction);


    const deployStage = pipeline.addStage({
      stageName: 'Deploy'
    });


    const lambdaAction = new cpactions.LambdaInvokeAction({
      actionName: 'InvokeAction',
      lambda: handler,
      userParameters: {
        blueEnvironment: blue_env,
        greenEnvironment: green_env,
        application: app_name
      },
      inputs: [sourceArtifact]
    });

    deployStage.addAction(lambdaAction);


  }
}

const app = new cdk.App();

new CdkStack(app, 'ElasticBeanstalkBG');

app.synth();
