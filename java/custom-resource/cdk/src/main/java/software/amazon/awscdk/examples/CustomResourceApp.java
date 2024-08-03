package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;
import java.util.HashMap;
import java.util.Map;

public class CustomResourceApp {

  private static Map<String, Object> props = new HashMap<String, Object>();
  public static void main(final String args[]) {
    App app = new App();

    props.put("Message", "AWS CDK");

    new CustomResourceStack(app, "cdk-custom-resource-example2", props);

    app.synth();
  }
}
