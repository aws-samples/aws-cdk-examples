import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.logging.LoggingUtils;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import software.amazon.lambda.powertools.cloudformation.AbstractCustomResourceHandler;
import software.amazon.lambda.powertools.cloudformation.Response;


public class CustomResourceHandlerPT extends AbstractCustomResourceHandler {
    
    @Logging(logEvent = true)
    @Override
    protected Response create(CloudFormationCustomResourceEvent createEvent, Context context) {
        LoggingUtils.appendKey("operation", "create");
        LoggingUtils.appendKey("resourceProperties", resourceProperties);
        
        String message = (String) resourceProperties.get("Message");
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("Response", String.format("Resource message \"%s\"", message));
        
        return Response.success(attributes).withData(attributes);
    }

    @Logging(logEvent = true)
    @Override
    protected Response update(CloudFormationCustomResourceEvent updateEvent, Context context) {

        LoggingUtils.appendKey("operation", "update");
        LoggingUtils.appendKey("physicalResourceId", physicalResourceId);
        
        return Response.success(physicalResourceId);
    }

    @Logging(logEvent = true)
    @Override
    protected Response delete(CloudFormationCustomResourceEvent deleteEvent, Context context) {

        LoggingUtils.appendKey("operation", "delete");
        LoggingUtils.appendKey("physicalResourceId", physicalResourceId);
        
        return Response.success(physicalResourceId);
    }
}
