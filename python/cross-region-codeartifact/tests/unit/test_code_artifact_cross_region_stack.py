import aws_cdk as core
import aws_cdk.assertions as assertions

from code_artifact_cross_region_project.code_artifact_cross_region_stack import CodeArtifactCrossRegionStack

# example tests. To run these tests, uncomment this file along with the example
# resource in code_artifact_cross_region/code_artifact_cross_region_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = CodeArtifactCrossRegionStack(app, "code-artifact-cross-region")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
