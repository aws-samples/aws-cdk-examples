import { CodeCommitSourceAction, CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { ArnFormat, Stack, StackProps } from "aws-cdk-lib"
import { PipelineProject, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild"
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline"
import { Repository } from "aws-cdk-lib/aws-codecommit"
import { Construct } from "constructs"
import { lambdaApiStackName, lambdaFunctionName } from "../bin/lambda"

interface CIStackProps extends StackProps {
    repositoryName: string
}

export class CIStack extends Stack {
    constructor(scope: Construct, name: string, props: CIStackProps) {
        super(scope, name, props)

        const pipeline = new Pipeline(this, "Pipeline", {})

        const repo = Repository.fromRepositoryName(
            this,
            "WidgetsServiceRepository",
            props.repositoryName,
        )
        const sourceOutput = new Artifact("SourceOutput")
        const sourceAction = new CodeCommitSourceAction({
            actionName: "CodeCommit",
            repository: repo,
            output: sourceOutput,
            branch: "main",
        })
        pipeline.addStage({
            stageName: "Source",
            actions: [sourceAction],
        })

        this.createBuildStage(pipeline, sourceOutput)
    }

    private createBuildStage(pipeline: Pipeline, sourceOutput: Artifact) {
        const project = new PipelineProject(this, `BuildProject`, {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_7_0,
            },
        })
        const cdkAssumeRolePolicy = new PolicyStatement()
        cdkAssumeRolePolicy.addActions("sts:AssumeRole")
        cdkAssumeRolePolicy.addResources(
            this.formatArn({
                service: "iam",
                resource: "role",
                region: "",
                resourceName: "cdk-*",
            }),
        )
        const cdkDeployPolicy = new PolicyStatement()
        cdkDeployPolicy.addActions(
            "cloudformation:GetTemplate",
            "cloudformation:CreateChangeSet",
            "cloudformation:DescribeChangeSet",
            "cloudformation:ExecuteChangeSet",
            "cloudformation:DescribeStackEvents",
            "cloudformation:DeleteChangeSet",
            "cloudformation:DescribeStacks",
            "s3:*Object",
            "s3:ListBucket",
            "s3:getBucketLocation",
            "lambda:UpdateFunctionCode",
            "lambda:GetFunction",
            "lambda:CreateFunction",
            "lambda:DeleteFunction",
            "lambda:GetFunctionConfiguration",
            "lambda:AddPermission",
            "lambda:RemovePermission",
            "ssm:GetParameter",
        )
        cdkDeployPolicy.addResources(
            this.formatArn({
                service: "cloudformation",
                resource: "stack",
                resourceName: "CDKToolkit/*",
            }),
            this.formatArn({
                service: "cloudformation",
                resource: "stack",
                resourceName: `${lambdaApiStackName}/*`,
            }),
            this.formatArn({
                service: "lambda",
                resource: "function",
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                resourceName: lambdaFunctionName,
            }),
            this.formatArn({
                service: "ssm",
                resource: "parameter",
                resourceName: "cdk-bootstrap/*",
            }),
            "arn:aws:s3:::cdktoolkit-stagingbucket-*",
        )
        const editOrCreateLambdaDependencies = new PolicyStatement()
        editOrCreateLambdaDependencies.addActions(
            "iam:GetRole",
            "iam:PassRole",
            "iam:CreateRole",
            "iam:AttachRolePolicy",
            "iam:PutRolePolicy",
            "apigateway:GET",
            "apigateway:DELETE",
            "apigateway:PUT",
            "apigateway:POST",
            "apigateway:PATCH",
            "s3:CreateBucket",
            "s3:PutBucketTagging",
        )
        editOrCreateLambdaDependencies.addResources("*")
        project.addToRolePolicy(cdkDeployPolicy)
        project.addToRolePolicy(editOrCreateLambdaDependencies)
        project.addToRolePolicy(cdkAssumeRolePolicy)

        const buildOutput = new Artifact(`BuildOutput`)
        const buildAction = new CodeBuildAction({
            actionName: `Build`,
            project,
            input: sourceOutput,
            outputs: [buildOutput],
        })

        pipeline.addStage({
            stageName: "build",
            actions: [buildAction],
        })

        return buildOutput
    }
}
