using Amazon.CDK;
using Amazon.CDK.AWS.CodePipeline.Actions;
using Amazon.CDK.AWS.CodePipeline;
using Amazon.CDK.AWS.CodeCommit;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.S3;
using Constructs;
using System.Collections.Generic;

namespace ElasticbeanstalkBgPipeline
{
    public class ElasticbeanstalkBgPipelineStack : Stack
    {
        public ElasticbeanstalkBgPipelineStack(Construct scope, string id, IStackProps props = null) : base(scope, id)
        {
            var blueEnv = this.Node.TryGetContext("blue_env");
            var greenEnv = this.Node.TryGetContext("green_env");
            var appName = this.Node.TryGetContext("app_name");

            var bucket = new Bucket(this, "BlueGreenBucket", new BucketProps
            {
                // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
                // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
                // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
                RemovalPolicy = RemovalPolicy.DESTROY // NOT recommended for production code
            });

            var handler = new Function(this, "BlueGreenLambda", new FunctionProps
            {
                Runtime = Runtime.PYTHON_3_7,
                Code = Code.FromAsset("resources"),
                Handler = "blue_green.lambda_handler",
                Environment = new Dictionary<string, string>
                {
                    ["BUCKET"] = bucket.BucketName
                }
            });

            bucket.GrantReadWrite(handler);

            var repo = new Repository(this, "Repository", new RepositoryProps
            {
                RepositoryName = "MyRepositoryName"
            });

            var pipeline = new Pipeline(this, "MyFirstPipeline");

            var sourceStage = pipeline.AddStage(new StageOptions
            {
                StageName = "Source"
            });

            var sourceArtifact = new Artifact_("Source");

            var sourceAction = new CodeCommitSourceAction(new CodeCommitSourceActionProps
            {
                ActionName = "CodeCommit",
                Repository = repo,
                Output = sourceArtifact
            });

            sourceStage.AddAction(sourceAction);

            var deployStage = pipeline.AddStage(new StageOptions
            {
                StageName = "Deploy"
            });

            var lambdaAction = new LambdaInvokeAction(new LambdaInvokeActionProps
            {
                ActionName = "InvokeAction",
                Lambda = handler,
                UserParameters = new Dictionary<string, object>
                {
                    ["blueEnvironment"] = blueEnv,
                    ["greenEnvironment"] = greenEnv,
                    ["application"] = appName
                },
                Inputs = new Artifact_[] {sourceArtifact}
            });

            deployStage.AddAction(lambdaAction);
        }
    }
}
