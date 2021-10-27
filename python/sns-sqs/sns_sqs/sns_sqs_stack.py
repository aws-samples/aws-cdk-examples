from aws_cdk import (
    core as cdk,
    aws_sns as sns,
    aws_sqs as sqs,
    aws_sns_subscriptions as subs,
)

class SnsSqsStack(cdk.Stack):

    def __init__(self, scope: cdk.Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create SNS Topic
        snsTopic = sns.Topic(self, "MyTopic", display_name="My Topic")

        # Create SQS queues
        # will accept messages with attribute number 1000 <= number <= 2000 OR is less than 10
        firstQueue = sqs.Queue(self, "MyFirstQueue")
        # will accept messages with attribute colour = red or colour = green
        secondQueue = sqs.Queue(self, "MySecondQueue")
        # will accept all messages
        thirdQueue = sqs.Queue(self, "MyThirdQueue")

        # define filter policies
        firstQueueFilterPolicy = {"number":  sns.SubscriptionFilter.numeric_filter(between={"start": 1000, "stop": 2000}, less_than=10)}
        secondQueueFilterPolicy = {"colour":  sns.SubscriptionFilter.string_filter(whitelist=["red", "green"])}
        
        # add subscriptions to SNS topic + define SQS queue and corresponding filter policy
        snsTopic.add_subscription(subs.SqsSubscription(firstQueue, filter_policy=firstQueueFilterPolicy))
        snsTopic.add_subscription(subs.SqsSubscription(secondQueue, filter_policy=secondQueueFilterPolicy))
        snsTopic.add_subscription(subs.SqsSubscription(thirdQueue))

