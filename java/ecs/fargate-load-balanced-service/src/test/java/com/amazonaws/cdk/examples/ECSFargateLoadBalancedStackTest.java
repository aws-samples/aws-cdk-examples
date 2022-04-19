package com.amazonaws.cdk.examples;

import software.amazon.awscdk.App;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.Test;

import java.io.IOException;

import static junit.framework.TestCase.assertEquals;

public class ECSFargateLoadBalancedStackTest {
    private final static ObjectMapper JSON =
        new ObjectMapper().configure(SerializationFeature.INDENT_OUTPUT, true);

    @Test
    public void testStack() throws IOException {
        App app = new App();
        ECSFargateLoadBalancedStack stack = new ECSFargateLoadBalancedStack(app, "test");

        // synthesize the stack to a CloudFormation template and compare against
        // a checked-in JSON file.
        JsonNode actual = JSON.valueToTree(app.synth().getStackArtifact(stack.getArtifactId()).getTemplate());
        JsonNode expected = JSON.readTree(getClass().getResource("expected.cfn.json"));
        assertEquals(expected, actual);
    }
}
