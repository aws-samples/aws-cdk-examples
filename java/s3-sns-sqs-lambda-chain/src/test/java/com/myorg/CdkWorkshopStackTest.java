package com.myorg;

import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.assertions.Template;

import java.io.IOException;

public class CdkWorkshopStackTest {

    @Test
    public void testStack() throws IOException {
        App app = new App();
        CdkWorkshopStack stack = new CdkWorkshopStack(app, "HelloHandler");
        Template template = Template.fromStack(stack);

        /*template.resourceCountIs("AWS::SNS::Topic", 1);
        template.resourceCountIs("AWS::SNS::Subscription", 1);
        template.resourceCountIs("AWS::SNS::TopicPolicy", 1);

        template.resourceCountIs("AWS::SQS::Queue", 2);
        template.resourceCountIs("AWS::SQS::QueuePolicy", 1);

        template.resourceCountIs("AWS::S3::Bucket", 1);
        template.resourceCountIs("Custom::S3BucketNotifications", 1);

        template.resourceCountIs("AWS::Lambda::Function", 2);
        template.resourceCountIs("AWS::Lambda::EventSourceMapping", 1);*/

    }
}
