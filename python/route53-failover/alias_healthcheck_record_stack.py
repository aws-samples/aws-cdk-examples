from constructs import Construct
from aws_cdk import (
    Stack,
    aws_route53 as route53,
    aws_elasticloadbalancingv2 as elbv2,
    aws_route53_targets as route53_targets,
)

class AliasHealthcheckRecordStack(Stack):
  def __init__(self, scope: Construct, construct_id: str, zone: route53.HostedZone, primaryLoadBalancer: elbv2.ILoadBalancerV2, secondaryLoadBalancer: elbv2.ILoadBalancerV2, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # primary record
        primary = route53.ARecord(self, "PrimaryRecordSet",
            zone = zone,
            record_name="alias",
            target = route53.RecordTarget.from_alias(route53_targets.LoadBalancerTarget(primaryLoadBalancer)),
        )
        primaryRecordSet = primary.node.default_child
        primaryRecordSet.failover = "PRIMARY"
        primaryRecordSet.add_property_override('AliasTarget.EvaluateTargetHealth', True)
        primaryRecordSet.set_identifier = "Primary"

        # secondary record
        secondary = route53.ARecord(self, "SecondaryRecordSet",
            zone = zone,
            record_name="alias",
            target= route53.RecordTarget.from_alias(route53_targets.LoadBalancerTarget(secondaryLoadBalancer)),
        )
        secondaryRecordSet = secondary.node.default_child
        secondaryRecordSet.failover = "SECONDARY"
        secondaryRecordSet.add_property_override('AliasTarget.EvaluateTargetHealth', True)
        secondaryRecordSet.set_identifier = "Secondary"

        # # cloudwatch metric & alarm to SNS
        # snsTopic = sns.Topic(self, "AlarmNotificationTopic")
        # snsTopic.add_subscription(
        #     EmailSubscription(email_address=email)
        # )

        # healthCheckMetric = cloudwatch.Metric(
        #     metric_name="HealthCheckStatus",
        #     namespace="AWS/Route53",
        #     statistic="Minimum",
        #     period=Duration.minutes(1),
        #     region="us-east-1",
        #     dimensions_map={
        #         "HealthCheckId": primaryHealthCheck.attr_health_check_id
        #     }
        # )
        # healthCheckAlarm = healthCheckMetric.create_alarm(self, 'HealthCheckFailureAlarm', 
        #     evaluation_periods=1,
        #     threshold=1,
        #     comparison_operator=cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD
        # )

        # healthCheckAlarm.add_alarm_action(SnsAction(snsTopic))
