package software.amazon.awscdk.examples;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static software.amazon.awscdk.examples.TestUtils.toCloudFormationJson;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.Before;
import org.junit.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;

public class LambdaCronStackTest {
  private JsonNode actualStack;
  private JsonNode expectedStack;

  @Before
  public void setUp() throws IOException {
    App app = new App();
    Stack stack = new LambdaCronStack(app, "lambdaResource-cdk-lambda-cron");
    actualStack = toCloudFormationJson(app, stack).path("Resources");
    expectedStack =
        TestUtils.fromFileResource(getClass().getResource("testCronLambdaExpected.json"))
            .path("Resources");
  }

  @Test
  public void testTypes() {
    List<String> actual =
        actualStack.findValues("Type").stream()
            .map(JsonNode::textValue)
            .collect(Collectors.toList());
    String[] expected =
        expectedStack.findValues("Type").stream().map(JsonNode::textValue).toArray(String[]::new);
    assertThat(actual, containsInAnyOrder(expected));
  }

  @Test
  public void testPermission() {
    final String type = "AWS::Lambda::Permission";
    JsonNode actual = TestUtils.getJsonNode(actualStack, type);
    JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
    String[] keys = {"ManagedPolicyArns", "AssumeRolePolicyDocument"};
    for (String key : keys) {
      assertThat(actual.get(key), equalTo(expected.get(key)));
    }
  }

  @Test
  public void testRole() {
    final String type = "AWS::IAM::Role";
    JsonNode actual = TestUtils.getJsonNode(actualStack, type);
    JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
    String[] keys = {"ManagedPolicyArns", "AssumeRolePolicyDocument"};
    for (String key : keys) {
      assertThat(actual.get(key), equalTo(expected.get(key)));
    }
  }

  @Test
  public void testLambda() {
    final String type = "AWS::Lambda::Function";
    JsonNode actual = TestUtils.getJsonNode(actualStack, type);
    JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
    String[] keys = {"Runtime", "Description", "Timeout", "Handler", "Code", "FunctionName"};
    for (String key : keys) {
      assertThat(actual.get(key), equalTo(expected.get(key)));
    }
  }

  @Test
  public void testRule() {
    final String type = "AWS::Events::Rule";
    JsonNode actual = TestUtils.getJsonNode(actualStack, type);
    JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
    String[] keys = {"ScheduleExpression", "Description", "State"};
    for (String key : keys) {
      assertThat(actual.get(key), equalTo(expected.get(key)));
    }
  }
}
