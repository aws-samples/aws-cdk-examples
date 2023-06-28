package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.apigateway.LambdaIntegration;
import software.amazon.awscdk.services.apigateway.Resource;
import software.amazon.awscdk.services.apigateway.RestApi;
import software.amazon.awscdk.services.iam.IManagedPolicy;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.s3.Bucket;

public class MyWidgetServiceStack extends Stack {
  public MyWidgetServiceStack(final Construct scope, final String id) {
    super(scope, id, null);

    Bucket bucket = Bucket.Builder.create(this, "WidgetStore").build();

    RestApi api =
        RestApi.Builder.create(this, "widgets-api")
            .restApiName("Widget Service")
            .description("This service serves widgets.")
            .build();

    List<IManagedPolicy> managedPolicyArray = new ArrayList<IManagedPolicy>();
    managedPolicyArray.add(
        (IManagedPolicy) ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"));

    Role.Builder.create(this, "RestAPIRole")
        .assumedBy(new ServicePrincipal("apigateway.amazonaws.com"))
        .managedPolicies(managedPolicyArray)
        .build();

    Map<String, String> environmentVariables = new HashMap<String, String>();
    environmentVariables.put("BUCKET", bucket.getBucketName());

    Function lambdaFunction =
        Function.Builder.create(this, "WidgetHandler")
            .code(Code.fromAsset("resources"))
            .handler("widgets.main")
            .timeout(Duration.seconds(300))
            .runtime(Runtime.NODEJS_16_X)
            .environment(environmentVariables)
            .build();

    bucket.grantReadWrite(lambdaFunction);

    Map<String, String> lambdaIntegrationMap = new HashMap<String, String>();
    lambdaIntegrationMap.put("application/json", "{ \"statusCode\": \"200\" }");

    LambdaIntegration getWidgetIntegration =
        LambdaIntegration.Builder.create(lambdaFunction)
            .requestTemplates(lambdaIntegrationMap)
            .build();

    api.getRoot().addMethod("GET", getWidgetIntegration);

    LambdaIntegration postWidgetIntegration = new LambdaIntegration(lambdaFunction);
    LambdaIntegration deleteWidgetIntegration = new LambdaIntegration(lambdaFunction);

    Resource widget = api.getRoot().addResource("{id}");

    widget.addMethod("POST", postWidgetIntegration);
    widget.addMethod("GET", getWidgetIntegration);
    widget.addMethod("DELETE", deleteWidgetIntegration);
  }
}
