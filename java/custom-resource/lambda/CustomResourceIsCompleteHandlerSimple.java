package com.myapp;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import java.util.HashMap;
import java.util.Map;

public class CustomResourceHandlerSimple implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
        System.out.println(event);
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
        System.out.println("Create new resource with props " + props);

        String message = (String) props.get("Message");

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("Response", String.format("Resource message \"%s\"", message));

        Map<String, Object> response = new HashMap<>();
        response.put("Data", attributes);
        return response;
    }

    private Map<String, Object> onUpdate(Map<String, Object> event) {
        String physicalId = (String) event.get("PhysicalResourceId");
        @SuppressWarnings("unchecked")
        Map<String, Object> props = (Map<String, Object>) event.get("ResourceProperties");
        System.out.println("Update resource " + physicalId + " with props " + props);
        // Add your update logic here...

        Map<String, Object> response = new HashMap<>();
        response.put("PhysicalResourceId", physicalId);
        return response;
    }

    private Map<String, Object> onDelete(Map<String, Object> event) {
        String physicalId = (String) event.get("PhysicalResourceId");
        System.out.println("Delete resource " + physicalId);
        // Add your delete logic here...

        Map<String, Object> response = new HashMap<>();
        response.put("PhysicalResourceId", physicalId);
        return response;
    }
}

// Separate class for isComplete handler
public class CustomResourceIsCompleteHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
        String physicalId = (String) event.get("PhysicalResourceId");
        String requestType = (String) event.get("RequestType");

        // Add your stabilization logic here based on requestType
        // boolean isReady = ...

        Map<String, Object> response = new HashMap<>();
        response.put("IsComplete", true);
        return response;
    }
}
