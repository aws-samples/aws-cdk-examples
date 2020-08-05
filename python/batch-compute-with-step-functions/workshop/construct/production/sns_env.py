from aws_cdk import (
    aws_sns as _sns,
    aws_sns_subscriptions as _subs,
    core
)

class SnsENV(core.Construct):
    def getSNSTopic(self,name):
        return self.SNSTopicList[name]
    
    def __init__(self, scope: core.Construct, id: str,UserName="default",EmailAddress="default",**kwargs):
        super().__init__(scope, id, **kwargs)
        self.SNSTopicList = {}
        
        self.Topic_Batch_Job_Notification = _sns.Topic(self, "Batch_Job_Notification",
            display_name="BatchJobNotification_" + UserName,
            topic_name="BatchJobNotification_" + UserName
        )
        self.Topic_Batch_Job_Notification.add_subscription(_subs.EmailSubscription(EmailAddress))
        
        self.SNSTopicList["Topic_Batch_Job_Notification"] = self.Topic_Batch_Job_Notification