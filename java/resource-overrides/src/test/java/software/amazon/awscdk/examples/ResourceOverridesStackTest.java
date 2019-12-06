package software.amazon.awscdk.examples;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.junit.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;
import software.amazon.awscdk.core.App;
import software.amazon.awscdk.core.ConstructNode;
import software.amazon.awscdk.core.IConstruct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.cxapi.CloudFormationStackArtifact;

public class ResourceOverridesStackTest {
  private static final ObjectMapper JSON = new ObjectMapper();

  @Test
  public void shouldGenerateValidCloudFormationTemplate() throws Exception {
    App app = new App();
    Stack stack = new ResourceOverridesStack(app, "resource-overrides");

    String actual = getStackTemplateJson(stack).toPrettyString();
    String expected = readJsonFromResource("testResourceOverrides.expected.json").toPrettyString();

    JSONAssert.assertEquals(expected, actual, JSONCompareMode.LENIENT);
  }

  private static JsonNode readJsonFromResource(String resourceName) throws IOException {
    return JSON.readTree(ResourceOverridesStackTest.class.getResource(resourceName));
  }

  private static JsonNode getStackTemplateJson(Stack stack) {
    IConstruct root = stack.getNode().getRoot();
    CloudFormationStackArtifact stackArtifact =
        ConstructNode.synth(root.getNode()).getStackByName(stack.getStackName());

    return JSON.valueToTree(stackArtifact.getTemplate());
  }
}
