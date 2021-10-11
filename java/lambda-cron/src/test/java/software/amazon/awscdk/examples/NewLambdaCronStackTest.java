package software.amazon.awscdk.examples;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.stringContainsInOrder;
import static org.junit.Assert.assertThat;

import java.io.IOException;
import java.util.Map;
import java.util.Arrays;
import org.junit.Before;
import org.junit.Test;
import software.amazon.awscdk.core.App;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.assertions.Template;
import software.amazon.awscdk.assertions.Capture;
import software.amazon.awscdk.assertions.Match;

public class NewLambdaCronStackTest {
  private Template template;

  @Before
  public void setUp() throws IOException {
    App app = new App();
    Stack stack = new LambdaCronStack(app, "lambdaResource-cdk-lambda-cron");
    template = Template.fromStack(stack);
  }

  @Test
  public void testSpecifiedResourcesCreated() {
    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.resourceCountIs("AWS::Events::Rule", 1);
  }

  @Test
  public void testLambdaProperties() {
    Capture dependencyCapture = new Capture();
    template.hasResource("AWS::Lambda::Function", Map.of(
      "Properties", Map.of(
        "Code", Map.of(
          "ZipFile", "def main(event, context):\n    print(\"I'm running!\")\n"
        ),
        "Handler", "index.main",
        "Runtime", "python2.7",
        "Timeout", 300
      ),
      "DependsOn", Arrays.asList(dependencyCapture)
    ));

    assertThat(dependencyCapture.asString(), stringContainsInOrder(Arrays.asList("Singleton", "ServiceRole")));
  }

  @Test
  public void testLambdaIamPermissions() {
    Capture roleCapture = new Capture();
    template.hasResourceProperties("AWS::IAM::Role", Map.of(
      "AssumeRolePolicyDocument", Match.objectLike(Map.of(
        "Statement", Arrays.asList(Map.of(
          "Action", "sts:AssumeRole",
          "Effect", "Allow",
          "Principal", Map.of(
            "Service", "lambda.amazonaws.com"
          )
        ))
      )),
      "ManagedPolicyArns", Arrays.asList(Map.of(
        "Fn::Join", Match.arrayWith(Arrays.asList(
          Arrays.asList("arn:", Map.of("Ref", "AWS::Partition"), roleCapture)
        ))
      ))
    ));

    assertThat(roleCapture.asString(), stringContainsInOrder(Arrays.asList("AWSLambdaBasicExecutionRole")));
  }

  @Test
  public void testLambdaNotInVpc() {
    template.hasResource("AWS::Lambda::Function", Map.of(
      "Vpc", Match.absent()
    ));
  }

  @Test
  public void testEventHasCorrectRule() {
    template.hasResourceProperties("AWS::Events::Rule", Map.of(
      "ScheduleExpression", "cron(0 18 ? * MON-FRI *)",
      "State", "ENABLED",
      "Targets", Match.anyValue()
    ));
  }
}