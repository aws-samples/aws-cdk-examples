import platform
import cdk_nag
from aws_cdk import (aws_dynamodb as ddb,
                     aws_events as events,
                     aws_events_targets as event_targets,
                     aws_iam as iam,
                     aws_lambda as lambda_,
                     aws_lambda_event_sources as event_sources,
                     aws_sns as sns,
                     aws_sns_subscriptions as sns_subscriptions,
                     aws_logs as logs,
                     aws_sqs as sqs,
                     Duration,
                     RemovalPolicy,
                     Stack)
from constructs import Construct


class MessageTracker(Construct):
    def __init__(self, scope: Stack, construct_id: str, notifications_topic_arn: str, dlq: sqs.Queue) -> None:
        super().__init__(scope, construct_id)

        # Determine the lambda platform architecture
        if platform.machine() == 'arm64':
            lambda_architecture = lambda_.Architecture.ARM_64
        else:
            lambda_architecture = lambda_.Architecture.X86_64

        # WhatsApp messaging components, also create a suscription for SNS -> SQS routing
        notifications_topic = sns.Topic.from_topic_arn(scope=self,
                                                       id='WhatsAppNotificationsTopic',
                                                       topic_arn=notifications_topic_arn)
        wa_notifications_queue = sqs.Queue(scope=self,
                                           id='WhatsAppNotificationQueue',
                                           retention_period=Duration.hours(2),
                                           dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=10,
                                                                                 queue=dlq))
        wa_notifications_queue.add_to_resource_policy(iam.PolicyStatement(effect=iam.Effect.DENY,
                                                                          principals=[iam.AnyPrincipal()],
                                                                          actions=['sqs:*'],
                                                                          resources=[wa_notifications_queue.queue_arn],
                                                                          conditions={'Bool': {
                                                                              'aws:SecureTransport': 'false'}}))
        notifications_topic.add_subscription(sns_subscriptions.SqsSubscription(queue=wa_notifications_queue,
                                                                               raw_message_delivery=True))

        # SMS messaging components, send EventBridge events to SQS
        event_rule = events.Rule(scope=self,
                                 id='SMSNotificationsRule',
                                 enabled=True,
                                 event_pattern={'source': ['aws.sms-voice'],
                                                'detail_type': ['Text Message Delivery Status Updated']})
        sms_notifications_queue = sqs.Queue(scope=self,
                                            id='SMSNotificationQueue',
                                            retention_period=Duration.hours(2),
                                            dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=10,
                                                                                  queue=dlq))
        sms_notifications_queue.add_to_resource_policy(iam.PolicyStatement(effect=iam.Effect.DENY,
                                                                           principals=[iam.AnyPrincipal()],
                                                                           actions=['sqs:*'],
                                                                           resources=[
                                                                               sms_notifications_queue.queue_arn],
                                                                           conditions={'Bool': {
                                                                               'aws:SecureTransport': 'false'}}))
        event_rule.add_target(event_targets.SqsQueue(sms_notifications_queue))

        # DynamoDB table to keep track of user consent to message them
        self.consent_table = ddb.TableV2(scope=self,
                                         id='WAConsentTable',
                                         removal_policy=RemovalPolicy.DESTROY,
                                         partition_key=ddb.Attribute(name='phone_id',
                                                                     type=ddb.AttributeType.STRING),
                                         time_to_live_attribute='expiration_date')
        # DynamoDB table to keep track of WhatsApp mesage status
        self.message_tracking_table = ddb.TableV2(scope=self,
                                                  id='MessageTrackingTable',
                                                  removal_policy=RemovalPolicy.DESTROY,
                                                  partition_key=ddb.Attribute(name='eum_msg_id',
                                                                              type=ddb.AttributeType.STRING),
                                                  time_to_live_attribute='expiration_date')
        self.message_tracking_table.add_global_secondary_index(index_name='WhatsAppMessageId',
                                                               partition_key=ddb.Attribute(name='wa_msg_id',
                                                                                           type=ddb.AttributeType.STRING),
                                                               projection_type=ddb.ProjectionType.KEYS_ONLY)

        # WhatsApp status change handling Lambda
        self.wa_status_handler_lambda = lambda_.Function(scope=self,
                                                         id='WAMessageHandler',
                                                         code=lambda_.Code.from_asset('lambda/wa_status_handler',
                                                                                      exclude=['samples/']),
                                                         runtime=lambda_.Runtime.PYTHON_3_13,
                                                         handler='main.handler',
                                                         environment={'CONSENT_TABLE_NAME':
                                                                          self.consent_table.table_name,
                                                                      'TRACKING_TABLE_NAME':
                                                                          self.message_tracking_table.table_name},
                                                         timeout=Duration.seconds(10),
                                                         memory_size=256,
                                                         architecture=lambda_architecture,
                                                         log_group=logs.LogGroup(scope=self,
                                                                                 id='WAMessageHandlerLogGroup',
                                                                                 retention=logs.RetentionDays.THREE_DAYS,
                                                                                 removal_policy=RemovalPolicy.DESTROY))
        self.wa_status_handler_lambda.add_event_source(event_sources.SqsEventSource(wa_notifications_queue))
        self.consent_table.grant_read_write_data(self.wa_status_handler_lambda)
        self.message_tracking_table.grant_read_write_data(self.wa_status_handler_lambda)

        # SMS status change handling Lambda
        self.sms_status_handler_lambda = lambda_.Function(scope=self,
                                                          id='SMSMessageHandler',
                                                          code=lambda_.Code.from_asset('lambda/sms_status_handler'),
                                                          runtime=lambda_.Runtime.PYTHON_3_13,
                                                          handler='main.handler',
                                                          environment={'TRACKING_TABLE_NAME':
                                                                           self.message_tracking_table.table_name},
                                                          timeout=Duration.seconds(10),
                                                          memory_size=256,
                                                          architecture=lambda_architecture,
                                                          log_group=logs.LogGroup(scope=self,
                                                                                  id='SMSMessageHandlerLogGroup',
                                                                                  retention=logs.RetentionDays.THREE_DAYS,
                                                                                  removal_policy=RemovalPolicy.DESTROY))
        self.sms_status_handler_lambda.add_event_source(event_sources.SqsEventSource(sms_notifications_queue))
        self.message_tracking_table.grant_read_write_data(self.sms_status_handler_lambda)

        # Add cdk-nag suppresions for lambdas using the base lambda policy
        for path in ('/MessagingRESTAPI/MessageTracker/WAMessageHandler/ServiceRole/Resource',
                     '/MessagingRESTAPI/MessageTracker/SMSMessageHandler/ServiceRole/Resource'):
            cdk_nag.NagSuppressions.add_resource_suppressions_by_path(stack=scope,
                                                                      path=path,
                                                                      suppressions=[
                                                                          {
                                                                              "id": "AwsSolutions-IAM4",
                                                                              "reason": 'Using the AWS Lambda base '
                                                                                        'policy as starting point for the '
                                                                                        'Lambda roles',
                                                                          }
                                                                      ])
        for path in ('/MessagingRESTAPI/MessageTracker/WAMessageHandler/ServiceRole/DefaultPolicy/Resource',
                     '/MessagingRESTAPI/MessageTracker/SMSMessageHandler/ServiceRole/DefaultPolicy/Resource'):
            cdk_nag.NagSuppressions.add_resource_suppressions_by_path(stack=scope,
                                                                      path=path,
                                                                      suppressions=[
                                                                          {
                                                                              "id": "AwsSolutions-IAM5",
                                                                              "reason": 'Using the AWS Lambda base '
                                                                                        'policy as starting point for the '
                                                                                        'Lambda roles',
                                                                          }
                                                                      ])
