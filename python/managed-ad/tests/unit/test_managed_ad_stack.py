import aws_cdk as core
import aws_cdk.assertions as assertions

from managed_ad.managed_ad_stack import ManagedAdStack

# example tests. To run these tests, uncomment this file along with the example
# resource in managed_ad/managed_ad_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = ManagedAdStack(app, "managed-ad")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
