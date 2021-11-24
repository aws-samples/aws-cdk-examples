package software.amazon.awscdk.examples.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class UpdateItem implements RequestHandler<Map<String,Object>, GatewayResponse>{



    @Override
    public GatewayResponse handleRequest(Map<String, Object> input, Context context) {
        LambdaLogger logger = context.getLogger();
        logger.log("Inside software.amazon.awscdk.examples.lambda: getOneItem "+input.getClass()+ " data:"+input);
        Map<String, Object> pathParameters = (Map<String, Object>)input.get("pathParameters");
        String id=(String)pathParameters.get("id");

        String body = (String)input.get("body");
        logger.log("Body is:"+body);

        logger.log("updating data for input parameter:"+id);
        String output = updateData(id, body);

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        return new GatewayResponse(output, headers, 200);
    }

    private String updateData(String id, String body) {
        DynamoDbClient ddb = DynamoDbClient.create();
        String tableName= System.getenv("TABLE_NAME");
        String primaryKey = System.getenv("PRIMARY_KEY");
        Map<String, AttributeValue> tableKey = new HashMap<>();
        tableKey.put(primaryKey, AttributeValue.builder().s(id).build());

        Map<String, AttributeValueUpdate> item = new HashMap<>();

        JsonParser parser =  new JsonParser();
        JsonElement element = parser.parse(body);
        JsonObject jsonObject = element.getAsJsonObject();
        Set<String> keys = jsonObject.keySet();
        for (String key: keys) {
            item.put(key, AttributeValueUpdate.builder()
                            .value(AttributeValue.builder().s(jsonObject.get(key).getAsString()).build())
                            .action(AttributeAction.PUT)
                            .build()
                    );
        }

        UpdateItemRequest updateItemRequest = UpdateItemRequest.builder()
                .key(tableKey)
                .tableName(tableName)
                .attributeUpdates(item)
                .returnValues(ReturnValue.ALL_NEW)
                .build();
        UpdateItemResponse response = ddb.updateItem(updateItemRequest);
        return response.toString();
     
    }
}
