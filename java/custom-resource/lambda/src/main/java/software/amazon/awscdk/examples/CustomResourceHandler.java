package software.amazon.awscdk.examples;

import java.util.HashMap;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class CustomResourceHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
  @Override
  public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
    try {
      Map<String, Object> props = (Map<String, Object>) event.get("ResourceProperties");
      String message = (String) props.get("Message");

      Map<String, String> attributes = new HashMap<String, String>();
      attributes.put("Response", String.format("Resource message %s", message));

      Map<String, Object> result = new HashMap<String, Object>();
      result.put("Data", attributes);

      return result;
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
