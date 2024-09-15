package com.myorg;

import software.amazon.awscdk.*;
import software.amazon.awscdk.services.events.Rule;
import software.amazon.awscdk.services.events.RuleProps;
import software.amazon.awscdk.services.events.Schedule;
import software.amazon.awscdk.services.events.targets.LambdaFunction;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.PolicyStatementProps;
import software.amazon.awscdk.services.lambda.InlineCode;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SingletonFunction;
import software.amazon.awscdk.services.sns.Topic;
import software.amazon.awscdk.services.sns.TopicProps;
import software.amazon.awscdk.services.sns.subscriptions.EmailSubscription;
import software.constructs.Construct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public class EventBridgeLambdaStack extends Stack {
  public EventBridgeLambdaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
    TopicProps topicProps = TopicProps.builder()
      .displayName("Lambda SNS Topic")
      .build();
    Topic topic = new Topic(this, "Topic", topicProps);
    CfnParameterProps emailAddressCfnParameterProps = CfnParameterProps.builder()
      .type("String")
      .description("The e-mail address where notifications are to be sent.")
      .build();
    CfnParameter emailAddressParameter = new CfnParameter(this, "email", emailAddressCfnParameterProps);
    topic.addSubscription(new EmailSubscription(emailAddressParameter.getValueAsString()));
    SingletonFunction lambdaFunction = SingletonFunction.Builder.create(this, "Singleton")
      .functionName("Singleton")
      .code(InlineCode.fromInline(getInlineCode()))
      .handler("index.main")
      .timeout(Duration.seconds(300))
      .runtime(Runtime.PYTHON_3_9)
      .environment(Map.of("TOPIC_ARN", topic.getTopicArn()))
      .uuid("")
      .build();
    RuleProps ruleProps = RuleProps.builder()
      .schedule(Schedule.expression("cron(* * ? * * *)"))
      .build();
    Rule eventsRule = new Rule(this, "Rule", ruleProps);
    eventsRule.addTarget(new LambdaFunction(lambdaFunction));
    PolicyStatement snsTopicPolicy = new PolicyStatement(
      PolicyStatementProps.builder()
        .actions(List.of("sns:publish"))
        .resources(List.of("*"))
        .build()
    );
    lambdaFunction.addToRolePolicy(snsTopicPolicy);
  }

  private String getInlineCode() {
    try {
      return new String(Files.readAllBytes(Path.of("src/main/resources/lambda/lambda-handler.py")));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
