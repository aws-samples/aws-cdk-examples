from aws_cdk import (aws_iam as iam,
                     aws_sqs as sqs,
                     CfnParameter,
                     Duration,
                     RemovalPolicy,
                     Stack)
from constructs import Construct
from cdk.rest_api import RestAPI
from cdk.message_router import MessageRouter
from cdk.message_tracker import MessageTracker


class MessageAPI(Stack):
    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)

        whatsapp_notification_topic_arn = CfnParameter(scope=self,
                                                       id='WhatsAppNotificationTopicARN',
                                                       type='String',
                                                       description='The name of the topic used as an event destination '
                                                                   'in AWS End User Compute Social',
                                                       no_echo=True)
        configuration_set_arn = CfnParameter(scope=self,
                                             id='ConfigurationSetArn',
                                             type='String',
                                             description='ARN of the SES Configuration Set')
        message_type = CfnParameter(scope=self,
                                    id='MessageType',
                                    type='String',
                                    description='Message category to send',
                                    allowed_values=['PROMOTIONAL', 'TRANSACTIONAL'],
                                    default='TRANSACTIONAL')
        origination_entity = CfnParameter(scope=self,
                                          id='OriginatingEntity',
                                          type='String',
                                          description='Sender ID. Can be the phone number ID/ARN, '
                                                      'Sender ID/ARN or Pool ID/ARN')
        default_whatsapp_phone_arn = CfnParameter(scope=self,
                                                  id='WAPhoneNumberARN',
                                                  type='String',
                                                  description='The ARN for the phone number configured in AWS End User '
                                                              'Messaging Social that will be used for sending WhatsApp '
                                                              'Messages. Leave empty to try to automatically detect '
                                                              'the phone number.',
                                                  default=MessageRouter.get_waba_phone_number_arn())
        default_whatsapp_template = CfnParameter(scope=self,
                                                 id='WATemplate',
                                                 type='String',
                                                 description='The name of the WhatsApp template to send if the '
                                                             'WhatsApp message recipient has not written to our '
                                                             'number in the last 24h')

        # Dead Letter Queue to be used by all other queues
        dlq = sqs.Queue(scope=self,
                        id='DLQ',
                        removal_policy=RemovalPolicy.DESTROY,
                        retention_period=Duration.days(2))
        dlq.add_to_resource_policy(iam.PolicyStatement(effect=iam.Effect.DENY,
                                                       principals=[iam.AnyPrincipal()],
                                                       actions=['sqs:*'],
                                                       resources=[dlq.queue_arn],
                                                       conditions={'Bool': {
                                                           'aws:SecureTransport': 'false'}}))

        # Message tracking queue, in charge of tracking message delivery status & user consent
        message_tracker = MessageTracker(scope=self,
                                         construct_id='MessageTracker',
                                         notifications_topic_arn=whatsapp_notification_topic_arn.value_as_string,
                                         dlq=dlq)
        # Create the infrastructure used for sending the messages
        message_router = MessageRouter(scope=self,
                                       construct_id='MessageRouter',
                                       wa_notification_handler_lambda=message_tracker.wa_status_handler_lambda,
                                       consent_table=message_tracker.consent_table,
                                       message_tracking_table=message_tracker.message_tracking_table,
                                       configuration_set_arn=configuration_set_arn,
                                       message_type=message_type,
                                       origination_entity=origination_entity,
                                       default_whatsapp_template=default_whatsapp_template,
                                       default_whatsapp_phone_arn=default_whatsapp_phone_arn,
                                       dlq=dlq)
        # Rest API
        rest_api = RestAPI(scope=self,
                           construct_id='RestAPI',
                           sms_queue=message_router.sms_queue,
                           whatsapp_queue=message_router.wa_queue)
