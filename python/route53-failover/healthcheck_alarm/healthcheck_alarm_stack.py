from constructs import Construct
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_route53 as route53,
    aws_cloudwatch as cloudwatch,
    aws_sns as sns
)
from aws_cdk.aws_cloudwatch_actions import SnsAction
from aws_cdk.aws_sns_subscriptions import EmailSubscription

class HealthcheckAlarmStack(Stack):
  def __init__(self, scope: Construct, construct_id: str, cfnHealthCheck: route53.CfnHealthCheck, email: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # cloudwatch metric & alarm to SNS
        healthCheckMetric = cloudwatch.Metric(
            metric_name="HealthCheckStatus",
            namespace="AWS/Route53",
            statistic="Minimum",
            period=cdk.Duration.minutes(1),
            region="us-east-1",
            dimensions_map={
                "HealthCheckId": cfnHealthCheck.attr_health_check_id
            }
        )

        healthCheckAlarm = healthCheckMetric.create_alarm(self, 'HealthCheckFailureAlarm', 
            evaluation_periods=1,
            threshold=1,
            comparison_operator=cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD
        )

        snsTopic = sns.Topic(self, "AlarmNotificationTopic")

        snsTopic.add_subscription(
            EmailSubscription(email_address=email)
        )

        healthCheckAlarm.add_alarm_action(SnsAction(snsTopic))