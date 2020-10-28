from aws_cdk import (
    core,
    aws_iam as _iam,
    aws_codepipeline as _codepipeline,
    aws_codepipeline_actions as _codepipeline_actions,
    aws_codecommit as _codecommit,
    aws_codebuild as _codebuild
)

class CICDBatch(core.Construct):
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",Repo="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        
        self.My_CodeBuild_Role = _iam.Role(self, 'CodeBuildRole-Batch-' + UserName,
            assumed_by=_iam.CompositePrincipal(
                _iam.ServicePrincipal('ec2.amazonaws.com'),
                _iam.ServicePrincipal('codebuild.amazonaws.com')
            )
        )
        
        for repo in Repo.getRepositoriesList():
            Repo.getRepositories(repo).grant_pull_push(self.My_CodeBuild_Role)
        
        self.My_CodeCommit_Batch = _codecommit.Repository(self,
            "CodeCommit-Batch-" + UserName,
            repository_name="Workshop-Batch-" + UserName,
            description="CodeCommit for Batch Compute,Owner:" + UserName
        )
        
        self.My_CodeBuild_Batch = _codebuild.PipelineProject(self, 
            "CodeBuild-Batch" + UserName,
            project_name="CodeBuild-Batch" + UserName,
            role=self.My_CodeBuild_Role,
            environment=_codebuild.BuildEnvironment(
                build_image=_codebuild.LinuxBuildImage.STANDARD_2_0,
                privileged=True
            )
        )
        
        self.CodeCommit_Batch_Source = _codepipeline.Artifact("CodeCommit_Batch_Source-" + UserName)
        
        self.My_CodePipeline_Batch = _codepipeline.Pipeline(self, 
            "CodePipeline-Batch-" + UserName,
            stages=[
                _codepipeline.StageProps(
                    stage_name="Source",
                    actions=[
                        _codepipeline_actions.CodeCommitSourceAction(
                            action_name="CodeCommit_Batch_Source",
                            repository=self.My_CodeCommit_Batch,
                            branch="master",
                            output=self.CodeCommit_Batch_Source
                        )
                    ]
                ),
                _codepipeline.StageProps(
                    stage_name="Build",
                    actions=[
                        _codepipeline_actions.CodeBuildAction(
                            action_name="CodeCommit_Batch_Build",
                            project=self.My_CodeBuild_Batch,
                            input=self.CodeCommit_Batch_Source
                        )
                    ]
                )
            ]
        )
        
        core.CfnOutput(self,
            "CodeCommit For AWS Batch",
            value = self.My_CodeCommit_Batch.repository_clone_url_http
        )