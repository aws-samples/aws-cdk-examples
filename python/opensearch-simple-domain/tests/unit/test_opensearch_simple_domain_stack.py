import aws_cdk as core
import aws_cdk.assertions as assertions

from opensearch_simple_domain.opensearch_simple_domain_stack import OpensearchSimpleDomainStack

# example tests. To run these tests, uncomment this file along with the example
# resource in opensearch_simple_domain/opensearch_simple_domain_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = OpensearchSimpleDomainStack(app, "opensearch-simple-domain")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
