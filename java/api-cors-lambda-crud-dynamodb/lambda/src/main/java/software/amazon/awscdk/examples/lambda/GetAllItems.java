package software.amazon.awscdk.examples.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;
import software.amazon.awssdk.services.dynamodb.model.ScanResponse;

import java.util.HashMap;
import java.util.Map;

public class GetAllItems implements RequestHandler<Object, GatewayResponse>{



    @Override
    public GatewayResponse handleRequest(Object input, Context context) {
        LambdaLogger logger = context.getLogger();
        logger.log("Inside software.amazon.awscdk.examples.lambda: getAllItems ");

        String output = getData(context);

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");

        return new GatewayResponse(output, headers, 200);
    }

    private String getData(Context context) {
        DynamoDbClient ddb = DynamoDbClient.create();
        String tableName= System.getenv("TABLE_NAME");
        ScanRequest scanRequest= ScanRequest.builder()
                .tableName(tableName)
                .build();
        ScanResponse response = ddb.scan(scanRequest);
        return response.toString();
    }
}
