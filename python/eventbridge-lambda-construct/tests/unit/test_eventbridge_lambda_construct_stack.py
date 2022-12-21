import aws_cdk as core
import aws_cdk.assertions as assertions

from eventbridge_lambda_construct.stack import EventbridgeLambdaConstructStack

# example tests. To run these tests, uncomment this file along with the example
# resource in eventbridge_lambda_construct/stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = EventbridgeLambdaConstructStack(app, "eventbridge-lambda-construct")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
