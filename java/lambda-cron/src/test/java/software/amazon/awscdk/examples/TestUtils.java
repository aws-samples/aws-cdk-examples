package software.amazon.awscdk.examples;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awscdk.Stack;

import java.io.IOException;
import java.net.URL;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.StreamSupport;

import static org.junit.Assert.assertEquals;

public class TestUtils {
    private static ObjectMapper JSON = new ObjectMapper();

    static JsonNode fromFileResource(final URL fileResource) throws IOException {
        return JSON.readTree(fileResource);
    }

    static JsonNode toCloudFormationJson(final Stack stack) throws IOException {
        JsonNode n = JSON.valueToTree(stack.toCloudFormation());
        System.out.println(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(n));
        return n;
    }

    static void assertTemplate(final Stack stack, final URL expectedResource) throws IOException {
        assertTemplate(stack, JSON.readTree(expectedResource));
    }

    static void assertTemplate(final Stack stack, final String expectedTemplate) throws IOException {
        assertTemplate(stack, JSON.readTree(expectedTemplate));
    }

    private static void assertTemplate(final Stack stack, final JsonNode expected) throws IOException {
        JsonNode actual = toCloudFormationJson(stack);

        // print to stderr if non-equal, so it will be easy to grab
        if (expected == null || !expected.equals(actual)) {
            String prettyActual = JSON.writerWithDefaultPrettyPrinter().writeValueAsString(actual);
            System.err.println(prettyActual);
        }

        assertEquals(expected, actual);
    }

    static JsonNode getJsonNode(JsonNode stackJson, String type) {
        Iterable<JsonNode> iterable = stackJson::elements;
        Optional<JsonNode> maybe = StreamSupport.stream(iterable.spliterator(), false)
                .filter(jn -> jn.get("Type").textValue().equals(type)).findFirst();
        return maybe.map(jn -> jn.path("Properties")).orElseThrow(NoSuchElementException::new);
    }
}
