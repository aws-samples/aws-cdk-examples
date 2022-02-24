package software.amazon.awscdk.examples;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.junit.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.cxapi.CloudFormationStackArtifact;

public class ResourceOverridesStackTest {
  private static final ObjectMapper JSON = new ObjectMapper();

  @Test
  public void shouldGenerateValidCloudFormationTemplate() throws Exception {
    App app = new App();
    Stack stack = new ResourceOverridesStack(app, "resource-overrides");

    String actual = getStackTemplateJson(app, stack).toString();
    String expected = readJsonFromResource("testResourceOverrides.expected.json").toString();

    JSONAssert.assertEquals(expected, actual, JSONCompareMode.LENIENT);
  }

  private static JsonNode readJsonFromResource(String resourceName) throws IOException {
    return JSON.readTree(ResourceOverridesStackTest.class.getResource(resourceName));
  }

  private static JsonNode getStackTemplateJson(App app, Stack stack) {
    CloudFormationStackArtifact stackArtifact = app.synth().getStackByName(stack.getStackName());

    return JSON.valueToTree(stackArtifact.getTemplate());
  }
}
