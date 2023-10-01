import aws_cdk as core
import aws_cdk.assertions as assertions

from ec2_alarms_to_opsitem.ec2_alarms_to_opsitem_stack import Ec2AlarmsToOpsitemStack

# example tests. To run these tests, uncomment this file along with the example
# resource in ec2_alarms_to_opsitem/ec2_alarms_to_opsitem_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = Ec2AlarmsToOpsitemStack(app, "ec2-alarms-to-opsitem")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
