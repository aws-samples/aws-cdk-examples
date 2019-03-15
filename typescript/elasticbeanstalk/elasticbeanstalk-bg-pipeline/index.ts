import cdk = require('@aws-cdk/cdk');
import cp = require('@aws-cdk/aws-codepipeline');
import cc = require('@aws-cdk/aws-codecommit');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		//objects for access parameters
		const construct = new cdk.Construct(this, 'construct');
		const node = new cdk.ConstructNode(construct, this, 'node');

		const blue_env  = node.getContext("blue_env");
		const green_env = node.getContext("green_env");
		const app_name  = node.getContext("app_name");

		const bucket = new s3.Bucket(this, 'BlueGreenBucket');

		const handler = new lambda.Function(this, 'BlueGreenLambda', {
		runtime: lambda.Runtime.Python36,  
		code: lambda.Code.directory('resources'),
				handler: 'blue_green.lambda_handler',
				environment: {
					BUCKET: bucket.bucketName
				}
		});

		bucket.grantReadWrite(handler.role);

		const repo = new cc.Repository(this, 'Repository' ,{
			repositoryName: 'MyRepositoryName',
		});
		
		const pipeline = new cp.Pipeline(this, 'MyFirstPipeline');

		const sourceStage = pipeline.addStage({
			name: 'Source'
		});

		const sourceAction = new cc.PipelineSourceAction({
			actionName: 'CodeCommit',
			repository: repo,
		});

		sourceStage.addAction(sourceAction);


		const deployStage = pipeline.addStage({
			name: 'Deploy'
		});


		const lambdaAction = new lambda.PipelineInvokeAction({
			actionName: 'InvokeAction',
			lambda: handler,
			userParameters: '{"blueEnvironment":"'+blue_env+'","greenEnvironment":"'+green_env+'", "application":"'+app_name+'"}'
		});

		deployStage.addAction(lambdaAction);


	}}