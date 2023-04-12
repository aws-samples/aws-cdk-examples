import aws_cdk as core
import aws_cdk.assertions as assertions

from codepipeline_build_deploy.codepipeline_build_deploy_stack import CodepipelineBuildDeployStack

# example tests. To run these tests, uncomment this file along with the example
# resource in codepipeline_build_deploy/codepipeline_build_deploy_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = CodepipelineBuildDeployStack(app, "codepipeline-build-deploy")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
