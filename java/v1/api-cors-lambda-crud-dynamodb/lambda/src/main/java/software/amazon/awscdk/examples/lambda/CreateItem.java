package software.amazon.awscdk.examples.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class CreateItem implements RequestHandler<Map<String,Object>, GatewayResponse>{



    @Override
    public GatewayResponse handleRequest(Map<String, Object> input, Context context) {
        LambdaLogger logger = context.getLogger();
        logger.log("Inside software.amazon.awscdk.examples.lambda: getOneItem "+input.getClass()+ " data:"+input);


        String body = (String)input.get("body");
        logger.log("Body is:"+body);


        String output = createItem(body);

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        return new GatewayResponse(output, headers, 200);
    }

    private String createItem(String body) {
        DynamoDbClient ddb = DynamoDbClient.create();
        String tableName= System.getenv("TABLE_NAME");
        String primaryKey = System.getenv("PRIMARY_KEY");
        Map<String, AttributeValue> item = new HashMap<>();
        String id = UUID.randomUUID().toString();
        item.put(primaryKey, AttributeValue.builder().s(id).build());

        JsonParser parser =  new JsonParser();
        JsonElement element = parser.parse(body);
        JsonObject jsonObject = element.getAsJsonObject();
        Set<String> keys = jsonObject.keySet();
        for (String key: keys) {
            item.put(key, AttributeValue.builder().s(jsonObject.get(key).getAsString()).build());
        }

        PutItemRequest putItemRequest = PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build();
        PutItemResponse response = ddb.putItem(putItemRequest);
        return response.toString();
     
    }
}
