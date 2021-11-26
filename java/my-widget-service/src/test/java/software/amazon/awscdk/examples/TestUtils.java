package software.amazon.awscdk.examples;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URL;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.StreamSupport;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;

public class TestUtils {
  private static ObjectMapper JSON = new ObjectMapper();

  static JsonNode fromFileResource(final URL fileResource) throws IOException {
    return JSON.readTree(fileResource);
  }

  static JsonNode toCloudFormationJson(final App app, final Stack stack) throws IOException {
    JsonNode n =
        JSON.valueToTree(
            app.synth().getStackByName(stack.getStackName()).getTemplate());
    System.out.println(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(n));
    return n;
  }

  static JsonNode getJsonNode(JsonNode stackJson, String type) {
    Iterable<JsonNode> iterable = stackJson::elements;
    Optional<JsonNode> maybe =
        StreamSupport.stream(iterable.spliterator(), false)
            .filter(jn -> jn.get("Type").textValue().equals(type))
            .findFirst();
    return maybe.map(jn -> jn.path("Properties")).orElseThrow(NoSuchElementException::new);
  }
}
