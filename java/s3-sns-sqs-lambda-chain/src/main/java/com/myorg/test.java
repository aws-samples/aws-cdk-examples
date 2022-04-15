package com.myorg;

import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.EventType;
import software.amazon.awscdk.services.s3.NotificationKeyFilter;
import software.amazon.awscdk.services.s3.notifications.LambdaDestination;
import software.amazon.awscdk.services.sns.Topic;
import software.amazon.awscdk.services.sns.subscriptions.SqsSubscription;
import software.amazon.awscdk.services.sqs.DeadLetterQueue;
import software.amazon.awscdk.services.sqs.Queue;
import software.constructs.Construct;



public class test extends Stack {
    public test(final Construct parent, final String id) {
        this(parent, id, null);
    }

    public test(final Construct parent, final String id, final StackProps props) {
        super(parent, id, props);

        Queue dQueue = Queue.Builder.create(this, "cdk-dead-letter-queue-id")
                .retentionPeriod(Duration.days(7))
                .fifo(true)
                .build();
        DeadLetterQueue deadLetterQueue = DeadLetterQueue.builder().queue(dQueue)
                .maxReceiveCount(1)
                .build();

        Queue updateQueue = Queue.Builder.create(this, "cdk-upload-queue-id")
                .deadLetterQueue(deadLetterQueue)
                .visibilityTimeout(Duration.seconds(30))
                .fifo(true)
                .build();
        //SqsQueue.Builder.create(sQueue).build();
        Topic snsTopic = Topic.Builder.create(this, "cdk-sns-topic-id")
                .topicName("cdk-sns-topic")
                .fifo(true)
                .build();
        //SqsSubscription sqsSubscription = SqsSubscription.Builder.create(updateQueue).build();
        SqsSubscription sqsSubscription = new SqsSubscription(updateQueue);
        snsTopic.addSubscription(sqsSubscription);

        final Function sampleFunc = Function.Builder.create(this, "HelloHandler")
                .runtime(Runtime.NODEJS_14_X)
                .code(Code.fromAsset("lambda"))
                .handler("hello.handler") //filename.functionname
                .build();

        Bucket s3Bucket = Bucket.Builder.create(this, "cdk-s3-bucket-id")
                .bucketName("cdk-s3-bucket-name")
                .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
                .versioned(true)
                .build();

        //SnsDestination snsDestination = new SnsDestination(snsTopic);

        LambdaDestination lambdaDestination = new LambdaDestination(sampleFunc);

        s3Bucket.addEventNotification(EventType.OBJECT_CREATED,
                lambdaDestination,
                NotificationKeyFilter
                        .builder()
                        .prefix("uploads")
                        .suffix(".csv")
                        .build());

        /*s3Bucket.addEventNotification(EventType.OBJECT_CREATED_PUT,
                                                new SnsDestination(snsTopic),
                                                NotificationKeyFilter
                                                .builder()
                                                .prefix("uploads")
                                                .suffix(".csv")
                                                .build()
                                        );*/

        /*SqsEventSource eventSource = SqsEventSource.Builder.create(updateQueue).build();
        sampleFunc.addEventSource(eventSource);*/
    }
}

