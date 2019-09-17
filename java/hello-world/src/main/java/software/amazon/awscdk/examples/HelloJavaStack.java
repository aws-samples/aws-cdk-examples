package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroupProps;
import software.amazon.awscdk.services.ec2.AmazonLinuxImage;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.sns.Topic;

import java.util.Collections;
import java.util.List;

/**
 * Hello, CDK for Java!
 */
class HelloJavaStack extends Stack {
    public HelloJavaStack(final Construct parent, final String name) {
        super(parent, name);

        Vpc vpc = new Vpc(this, "VPC");

        MyAutoScalingGroupProps autoScalingGroupProps = new MyAutoScalingGroupProps();
        autoScalingGroupProps.vpc = vpc;

        int topicCount = 5;

        SinkQueue sinkQueue = new SinkQueue(this, "MySinkQueue", SinkQueueProps.builder().withRequiredTopicCount(5).build());

        for (int i = 0; i < topicCount; ++i) {
            sinkQueue.subscribe(new Topic(this, "Topic" + (i+1)));
        }

        new MyAutoScalingGroup(this, "MyAutoScalingGroup", autoScalingGroupProps);
    }

    static class MyAutoScalingGroupProps {
        public Vpc vpc;
    }

    static class MyAutoScalingGroup extends Construct {
        MyAutoScalingGroup(final Construct parent, final String name, final MyAutoScalingGroupProps props) {
            super(parent, name);

            new AutoScalingGroup(this, "Compute", AutoScalingGroupProps.builder()
                .withInstanceType(new InstanceType("t2.micro"))
                .withMachineImage(new AmazonLinuxImage())
                .withVpc(props.vpc)
                .build());
        }

        @Override
        public List<String> validate() {
            System.err.println("Validating MyAutoScalingGroup...");
            return Collections.emptyList();
        }
    }
}
