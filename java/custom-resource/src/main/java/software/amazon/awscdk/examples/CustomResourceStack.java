package software.amazon.awscdk.examples;

import java.nio.file.*;
import java.util.HashMap;
import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.CustomResource;
import software.amazon.awscdk.CustomResourceProvider;
import software.amazon.awscdk.CustomResourceProviderProps;
import software.amazon.awscdk.CustomResourceProviderRuntime;
import software.amazon.awscdk.Stack;

public class CustomResourceStack extends Stack {

  public CustomResourceStack(final Construct scope, final String id) {
    super(scope, id);

    try {

      // Sample Property to send to Lambda Function
      Map<String, Object> map = new HashMap<String, Object>();
      map.put("Message", "AWS CDK");

      String serviceToken = CustomResourceProvider.getOrCreate(this, "Custom::MyCustomResourceType", CustomResourceProviderProps.builder()
        .codeDirectory("./lambda/custom-resource-handler.py")
        .runtime(CustomResourceProviderRuntime.NODEJS_14_X)
        .description("Lambda function created by the custom resource provider")
        .build());

      final CustomResource myCustomResource =  CustomResource.Builder.create(this, "MyResource")
        .resourceType("Custom::MyCustomResourceType")
        .serviceToken(serviceToken)
        .properties(map)
        .build();

      // Publish the custom resource output
      CfnOutput.Builder.create(this, "MyCustomResourceOutput")
        .description("The message that came back from the Custom Resource")
        .value(myCustomResource.getAtt("Response").toString())
        .build();

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
  // function to read the file content
  public static String readFileAsString(String fileName) throws Exception {
    String data = "";
    try {
      data = new String(Files.readAllBytes(Paths.get(fileName)), "UTF-8");
    } catch (Exception e) {
      e.printStackTrace();
    }
    return data;
  }
}
