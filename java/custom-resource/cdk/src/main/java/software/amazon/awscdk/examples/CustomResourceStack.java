package software.amazon.awscdk.examples;

import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.CfnOutput;

public class CustomResourceStack extends Stack {
  public String response = "";
  public CustomResourceStack(final Construct scope, final String id, final Map<String, ? extends Object> props) {
    super(scope, id);

    try {
      MyCustomResource resource = new MyCustomResource(this, "DemoResource", props);

      CfnOutput.Builder.create(this, "ResponseMessage")
        .description("The message that came back from the Custom Resource")
        .value((resource.response))
        .build();

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
