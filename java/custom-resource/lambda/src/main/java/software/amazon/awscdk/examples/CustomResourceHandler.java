package software.amazon.awscdk.examples;

import java.util.HashMap;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class CustomResourceHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
  @Override
  public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
    String requestType = (String) event.get("RequestType");

    switch (requestType) {
      case "Create":
        return onCreate(event);
      case "Update":
        return onUpdate(event);
      case "Delete":
        return onDelete(event);
      default:
        throw new RuntimeException("Invalid request type: " + requestType);
    }
  }

  private Map<String, Object> onCreate(Map<String, Object> event) {
    @SuppressWarnings("unchecked")
    Map<String, Object> props = (Map<String, Object>) event.get("ResourceProperties");
    String message = (String) props.get("Message");

    Map<String, String> attributes = new HashMap<String, String>();
    attributes.put("Response", String.format("Resource message %s", message));

    Map<String, Object> response = new HashMap<String, Object>();
    response.put("Data", attributes);

    return response;
  }

  private Map<String, Object> onUpdate(Map<String, Object> event) {
    String physicalId = (String) event.get("PhysicalResourceId");
    Map<String, Object> response = new HashMap<String, Object>();
    response.put("PhysicalResourceId", physicalId);
    return response;
  }

  private Map<String, Object> onDelete(Map<String, Object> event) {
    String physicalId = (String) event.get("PhysicalResourceId");
    Map<String, Object> response = new HashMap<String, Object>();
    response.put("PhysicalResourceId", physicalId);
    return response;
  }
}
