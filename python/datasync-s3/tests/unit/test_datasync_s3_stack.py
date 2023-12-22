import aws_cdk as core
import aws_cdk.assertions as assertions

from datasync_s3.datasync_s3_stack import DatasyncS3Stack

# example tests. To run these tests, uncomment this file along with the example
# resource in datasync_s3/datasync_s3_stack.py
# def test_sqs_queue_created():
#    app = core.App()
#    stack = DatasyncS3Stack(app, "datasync-s3")
#    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
