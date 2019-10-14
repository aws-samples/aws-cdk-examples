from aws_cdk import (

    aws_codepipeline,
    aws_codepipeline_actions,
    aws_ssm,
    core,
)


class Pipeline(core.Stack):
    def __init__(self, app: core.App, id: str, props, **kwargs) -> None:
        super().__init__(app, id, **kwargs)
        # define the s3 artifact
        source_output = aws_codepipeline.Artifact(artifact_name='source')

        # define the pipeline
        pipeline = aws_codepipeline.Pipeline(
            self, "Pipeline",
            pipeline_name=f"{props.namespace}",
            artifact_bucket=props.bucket_obj,
            stages=[
                aws_codepipeline.StageProps(
                    stage_name='Source',
                    actions=[
                        aws_codepipeline_actions.S3SourceAction(

                            bucket=props.bucket_obj,
                            bucket_key='source.zip',
                            action_name='S3Source',
                            run_order=1,
                            output=source_output,

                        ),
                    ]
                ),
                aws_codepipeline.StageProps(

                    stage_name='Build',
                    actions=[aws_codepipeline_actions.CodeBuildAction(
                        action_name='DockerBuildImages',
                        # role=codepipeline_role,
                        input=source_output,
                        project=props.cb_docker_build,
                        run_order=1,

                    )
                    ]
                )
            ]

        )
        # pipeline param to get the
        pipeline_param = aws_ssm.StringParameter(
            self, "ParameterP",
            parameter_name=f"{props.namespace}-pipeline",
            string_value=pipeline.pipeline_name,
            description='cdk pipeline bucket'
        )
