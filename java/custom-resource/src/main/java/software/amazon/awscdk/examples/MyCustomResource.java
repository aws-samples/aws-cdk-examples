package software.amazon.awscdk.examples;

import java.nio.file.*;

import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.CustomResource;
import software.amazon.awscdk.Duration;
import java.util.UUID;
import software.amazon.awscdk.customresources.*;

import software.amazon.awscdk.services.logs.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.InlineCode;
import software.amazon.awscdk.services.lambda.SingletonFunction;

public class MyCustomResource extends Construct {
  public String response = "";
  public MyCustomResource(final Construct scope, final String id, final Map<String, ? extends Object> props) {
    super(scope, id);


    try {

      final SingletonFunction onEvent = SingletonFunction.Builder.create(this, "Singleton")
        .code(InlineCode.fromAsset("lambda"))
        .handler("custom-resource-handler.on_event")
        .runtime(Runtime.PYTHON_3_8)
        .uuid(UUID.randomUUID().toString())
        .timeout(Duration.minutes(1))
        .build();

      final Provider myProvider = Provider.Builder.create(this, "MyProvider")
        .onEventHandler(onEvent)
        .logRetention(RetentionDays.ONE_DAY)
        .build();

      final CustomResource resource = CustomResource.Builder.create(this, "Resource1")
        .serviceToken(myProvider.getServiceToken())
        .properties(props)
        .build();

      response = resource.getAtt("Response").toString();

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
  // function to read the file content
  public static String readFileAsString(String fileName) throws Exception {
    try {
      return new String(Files.readAllBytes(Paths.get(fileName)), "UTF-8");
    } catch (Exception e) {
      e.printStackTrace();
      throw e;
    }
  }
}
