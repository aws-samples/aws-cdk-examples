package software.amazon.awscdk.examples;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.Before;
import org.junit.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;

import java.io.IOException;
import java.util.List;

import static org.hamcrest.collection.IsIterableContainingInAnyOrder.containsInAnyOrder;
import static org.junit.Assert.assertEquals;
import static software.amazon.awscdk.examples.TestUtils.toCloudFormationJson;

public class LambdaCronStackTest {
    private App app;
    private Stack stack;
    private JsonNode actualStack;
    private JsonNode expectedStack;

    @Before
    public void setUp() throws IOException {
        app = new App();
        stack = new LambdaCronStack(app, "lambdaResource-cdk-lambda-cron");
        actualStack = toCloudFormationJson(stack).path("Resources");
        expectedStack = TestUtils.fromFileResource(getClass().getResource("testCronLambdaExpected.json")).path("Resources");
    }

    @Test()
    public void testTypes() {
        List<JsonNode> actual = actualStack.findValues("Type");
        List<JsonNode> expected = expectedStack.findValues("Type");
        containsInAnyOrder(actual, expected);
    }

    @Test
    public void testPermission() {
        final String type = "AWS::Lambda::Permission";
        JsonNode actual = TestUtils.getJsonNode(actualStack, type);
        JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
        String[] keys = {"ManagedPolicyArns", "AssumeRolePolicyDocument"};
        for (String key : keys) {
            assertEquals(actual.get(key), expected.get(key));
        }
    }

    @Test
    public void testRole() {
        final String type = "AWS::IAM::Role";
        JsonNode actual = TestUtils.getJsonNode(actualStack, type);
        JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
        String[] keys = {"ManagedPolicyArns", "AssumeRolePolicyDocument"};
        for (String key : keys) {
            assertEquals(actual.get(key), expected.get(key));
        }
    }

    @Test
    public void testLambda() {
        final String type = "AWS::Lambda::Function";
        JsonNode actual = TestUtils.getJsonNode(actualStack, type);
        JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
        String[] keys = {"Runtime", "Description", "Timeout", "Handler", "Code"};
        for (String key : keys) {
            assertEquals(actual.get(key), expected.get(key));
        }
    }

    @Test
    public void testRule() {
        final String type = "AWS::Events::Rule";
        JsonNode actual = TestUtils.getJsonNode(actualStack, type);
        JsonNode expected = TestUtils.getJsonNode(expectedStack, type);
        String[] keys = {"ScheduleExpression", "Description", "State"};
        for (String key : keys) {
            assertEquals(actual.get(key), expected.get(key));
        }
    }

}