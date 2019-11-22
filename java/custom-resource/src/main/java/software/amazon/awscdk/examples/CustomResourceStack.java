package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.CfnOutput;
import software.amazon.awscdk.core.CfnOutputProps;
import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Duration;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.services.cloudformation.*;
import software.amazon.awscdk.services.lambda.*;
import software.amazon.awscdk.services.lambda.Runtime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.nio.file.*;

public class CustomResourceStack extends Stack {

    public CustomResourceStack(final Construct parent, final String id) {
        super(parent, id);
        
        try {

            // Get the lambda function code
            String LambdaContent = readFileAsString("./lambda/custom-resource-handler.py");
            
            // Sample Lambda Function Resource
            final SingletonFunction lambdaFunction = new SingletonFunction(this, "cdk-lambda-customresource",
                    SingletonFunctionProps.builder()
                            .description("My Custom Resource Lambda")
                            .code(Code.fromInline(LambdaContent))
                            .handler("index.handler")
                            .timeout(Duration.seconds(300))
                            .runtime(Runtime.PYTHON_2_7)
                            .uuid(UUID.randomUUID().toString())
                            .build()
            );

            // Sample Property to send to Lambda Function
            Map<String, Object> map = new HashMap<String, Object>();
            map.put("Message", "AWS CDK");
            
            final CustomResource myCustomResource = new CustomResource(this, "MyCustomResource",CustomResourceProps.builder()
                    .provider(CustomResourceProvider.fromLambda(lambdaFunction))
                    .properties(map).build());

            
            // Publish the custom resource output
            CfnOutput cfnoutput = new CfnOutput(this, "MyCustomResourceOutput", 
                                        CfnOutputProps.builder().description("The message that came back from the Custom Resource")
                                        .value(myCustomResource.getAtt("Response").toString()).build());
            
            
        } catch (Exception e) {
            e.printStackTrace();
        }
        
    }
    // function to read the file content
    public static String readFileAsString(String fileName) throws Exception 
    {   
        String data = ""; 
        try
        {
            data = new String(Files.readAllBytes(Paths.get(fileName)),"UTF-8"); 
        } 
        catch (Exception e) 
        {
            e.printStackTrace();
        }
        return data; 
    } 
}
