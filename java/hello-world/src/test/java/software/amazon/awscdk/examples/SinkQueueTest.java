package software.amazon.awscdk.examples;

import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.util.AbstractMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.assertions.Template;
import software.amazon.awscdk.cxapi.CloudFormationStackArtifact;
import software.amazon.awscdk.services.sns.Topic;
import software.amazon.awscdk.services.sqs.QueueProps;
import software.amazon.jsii.JsiiException;

import static software.amazon.awscdk.examples.JDK9.entry;
import static software.amazon.awscdk.examples.JDK9.listOf;
import static software.amazon.awscdk.examples.JDK9.mapOf;

public class SinkQueueTest {

  /** Defines a queue sink with default props */
  @Test
  public void testDefaults() throws IOException {
    App app = new App();
    Stack stack = new Stack(app);
    new SinkQueue(stack, "MySinkQueue");

    Template template = Template.fromStack(stack);
    Map<String, Object> expected = Stream.of(
        new AbstractMap.SimpleEntry<>("UpdateReplacePolicy", "Delete"),
        new AbstractMap.SimpleEntry<>("DeletionPolicy", "Delete"))
      .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    template.hasResource("AWS::SQS::Queue", expected);
  }

  /** Defines a sink with custom queue props */
  @Test
  public void testQueueProps() throws IOException {
    App app = new App();
    Stack stack = new Stack(app);

    new SinkQueue(
        stack,
        "MySinkQueue",
        SinkQueueProps.builder()
            .withQueueProps(QueueProps.builder().visibilityTimeout(Duration.seconds(500)).build())
            .build());

    Template template = Template.fromStack(stack);
    Map<String, Object> expected = Stream.of(
        new AbstractMap.SimpleEntry<>("VisibilityTimeout", 500))
      .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    template.hasResourceProperties("AWS::SQS::Queue", expected);
  }

  /** Calls "subscribe" to add topics to the sink */
  @Test
  public void testSubscribeTopics() throws IOException {
    App app = new App();
    Stack stack = new Stack(app);

    SinkQueue sink = new SinkQueue(stack, "MySinkQueue");

    // add three topics in two calls to "subscribe"
    sink.subscribe(new Topic(stack, "Topic1"), new Topic(stack, "Topic2"));
    sink.subscribe(new Topic(stack, "Topic3"));

    Template template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::SNS::Subscription", mapOf(
      entry("Protocol", "sqs"),
      entry("Endpoint", mapOf(
        entry("Fn::GetAtt", listOf("MySinkQueueEFCD79C2", "Arn")))),
      entry("TopicArn", mapOf(
        entry("Ref", "Topic198E71B3E")))));
  }

  /** Verifies that if we exceed the number of allows topics, an exception is thrown */
  @Test
  public void failsIfExceedMaxTopic() {
    App app = new App();
    Stack stack = new Stack(app);

    SinkQueue sink =
        new SinkQueue(
            stack, "MySinkQueue", SinkQueueProps.builder().withRequiredTopicCount(3).build());

    sink.subscribe(new Topic(stack, "Topic1"));
    sink.subscribe(new Topic(stack, "Topic2"));
    sink.subscribe(new Topic(stack, "Topic3"));

    boolean thrown = false;
    try {
      sink.subscribe(new Topic(stack, "Topic4"));
    } catch (RuntimeException e) {
      thrown = true;
    }
    assertTrue(thrown);
  }

  /** Verifies that the sink queue validates that the exact number of subscribers was added */
  @Test(expected = JsiiException.class)
  public void failsIfNotEnoughTopics() {
    App app = new App();
    Stack stack = new Stack(app, "test");

    SinkQueue sink =
        new SinkQueue(
            stack, "MySinkQueue", SinkQueueProps.builder().withRequiredTopicCount(80).build());

    for (int i = 0; i < 77; ++i) {
      sink.subscribe(new Topic(stack, "Topic" + i));
    }

    getTemplate(app, stack);
  }

  private static Object getTemplate(App app, Stack stack) {
    CloudFormationStackArtifact stackArtifact =
        app.synth().getStackByName(stack.getStackName());
    return stackArtifact.getTemplate();
  }
}
