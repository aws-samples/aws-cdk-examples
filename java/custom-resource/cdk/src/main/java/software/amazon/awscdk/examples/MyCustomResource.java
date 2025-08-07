package software.amazon.awscdk.examples;

import java.util.Map;
import java.util.UUID;

import software.constructs.Construct;
import software.amazon.awscdk.CustomResource;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.customresources.*;

import software.amazon.awscdk.services.logs.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.SingletonFunction;

public class MyCustomResource extends Construct {
  public String response = "";
  
  public MyCustomResource(final Construct scope, final String id, final Map<String, ? extends Object> props) {
    super(scope, id);

    try {
      final SingletonFunction onEvent = SingletonFunction.Builder.create(this, "Singleton1")
        .uuid(UUID.randomUUID().toString())
        .code(Code.fromAsset("./asset/lambda-1.0.0-jar-with-dependencies.jar"))
        .handler("software.amazon.awscdk.examples.CustomResourceHandler")
        .runtime(Runtime.JAVA_21).memorySize(1024)
        .timeout(Duration.minutes(5))
        .build();

      final SingletonFunction isComplete = SingletonFunction.Builder.create(this, "Singleton2")
        .uuid(UUID.randomUUID().toString())
        .code(Code.fromAsset("./asset/lambda-1.0.0-jar-with-dependencies.jar"))
        .handler("software.amazon.awscdk.examples.CustomResourceIsCompleteHandler")
        .runtime(Runtime.JAVA_21).memorySize(1024)
        .timeout(Duration.minutes(5))
        .build();

      final Provider myProvider = Provider.Builder.create(this, "MyProvider")
        .onEventHandler(onEvent)
        .isCompleteHandler(isComplete)
        .logRetention(RetentionDays.ONE_DAY)
        .build();

      final CustomResource resource = CustomResource.Builder.create(this, "Resource1")
        .serviceToken(myProvider.getServiceToken())
        .properties(props)
        .build();

      response = resource.getAttString("Response");

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
