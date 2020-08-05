from aws_cdk import (
    core,
    aws_iam as _iam,
    aws_codepipeline as _codepipeline,
    aws_codepipeline_actions as _codepipeline_actions,
    aws_codecommit as _codecommit,
    aws_codebuild as _codebuild
)

class CICDWeb(core.Construct):
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",Repo="default",WebService="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        
        self.My_CodeBuild_Role = _iam.Role(self, 'CodeBuildRole-Web-' + UserName,
            assumed_by=_iam.CompositePrincipal(
                _iam.ServicePrincipal('ec2.amazonaws.com'),
                _iam.ServicePrincipal('codebuild.amazonaws.com')
            )
        )
        
        for repo in Repo.getRepositoriesList():
            Repo.getRepositories(repo).grant_pull_push(self.My_CodeBuild_Role)
        
        self.My_CodeCommit_Web = _codecommit.Repository(self,
            "CodeCommit-Web-" + UserName,
            repository_name="Workshop-Web-" + UserName,
            description="CodeCommit for Web Project,Owner:" + UserName
        )
        
        self.My_CodeBuild_Web = _codebuild.PipelineProject(self, 
            "CodeBuild-Web-" + UserName,
            project_name="CodeBuild-Web" + UserName,
            role=self.My_CodeBuild_Role,
            environment=_codebuild.BuildEnvironment(
                build_image=_codebuild.LinuxBuildImage.STANDARD_2_0,
                privileged=True
            )
        )
        
        self.CodeCommit_Web_Source = _codepipeline.Artifact("CodeCommit_Web_Source-" + UserName)
        self.EcsImage_Web_Source = _codepipeline.Artifact('EcsImage_Web_Source-' + UserName)
        self.FargateImage_Web_Source = _codepipeline.Artifact('FargateImage_Web_Source-' + UserName)
        
        self.My_CodePipeline_Web = _codepipeline.Pipeline(self, 
            "CodePipeline-Web-" + UserName,
            stages=[
                _codepipeline.StageProps(
                    stage_name="Source",
                    actions=[
                        _codepipeline_actions.CodeCommitSourceAction(
                            action_name="CodeCommit_Web_Source",
                            repository=self.My_CodeCommit_Web,
                            branch="master",
                            output=self.CodeCommit_Web_Source
                        )
                    ]
                ),
                _codepipeline.StageProps(
                    stage_name="Build",
                    actions=[
                        _codepipeline_actions.CodeBuildAction(
                            action_name="CodeCommit_Web_Build",
                            project=self.My_CodeBuild_Web,
                            input=self.CodeCommit_Web_Source,
                            outputs=[self.FargateImage_Web_Source]
                        )
                    ]
                ),
                _codepipeline.StageProps(
                    stage_name="Deploy",
                    actions = [
                        _codepipeline_actions.EcsDeployAction(
                            action_name='CodeDeploy_Web_Deploy',
                            service=WebService.getFargateService("WebApplicationService"),
                            input=self.FargateImage_Web_Source
                        )
                    ]
                )
            ]
        )
        
        core.CfnOutput(self,
            "CodeCommit For WebApplication",
            value = self.My_CodeCommit_Web.repository_clone_url_http
        )