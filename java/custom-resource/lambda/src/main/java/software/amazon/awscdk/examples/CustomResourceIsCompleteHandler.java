package software.amazon.awscdk.examples;

import java.util.HashMap;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class CustomResourceIsCompleteHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
  @Override
  public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
    Map<String, Object> response = new HashMap<String, Object>();
    response.put("IsComplete", true);
    return response;
  }
}
