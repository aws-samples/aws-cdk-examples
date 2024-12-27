package com.myorg;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apigateway.*;
import software.amazon.awscdk.services.lambda.*;
import software.constructs.Construct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static software.amazon.awscdk.services.apigatewayv2.HttpMethod.ANY;
import static software.amazon.awscdk.services.lambda.Runtime.PYTHON_3_12;

public class HttpProxyApiGatewayStack extends Stack {

  public record ProxyResourceParameters(String resourceId, String baseUrl, String httpMethod, String exampleRequest) {

  }

  private final RestApi restApi;

  public HttpProxyApiGatewayStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
    restApi = RestApi.Builder.create(this, "RestApi")
      .restApiName("RestApi")
      .cloudWatchRole(true)
      .cloudWatchRoleRemovalPolicy(RemovalPolicy.DESTROY)
      .endpointTypes(List.of(EndpointType.EDGE))
      .build();
    createHTTPTestAPIs().forEach(this::createProxyResource);
  }

  private List<ProxyResourceParameters> createHTTPTestAPIs() {
    return Map.of(
        "HelloFunction", "/hello?from=AWS",
        "ByeFunction", "/bye?from=AWS"
      ).entrySet().stream()
      .map(functionEntry -> {
        var functionName = functionEntry.getKey();
        var parameters = functionEntry.getValue();
        var function = Function.Builder.create(this, functionName)
          .functionName(functionName)
          .code(InlineCode.fromInline(getInlineCode("src/main/resources/lambdas/" + functionName + ".py")))
          .handler("index.handler")
          .runtime(PYTHON_3_12)
          .build();
        var lambdaFunctionAlias = Alias.Builder.create(this, functionName + "ProdAlias")
          .aliasName("Prod")
          .version(function.getCurrentVersion())
          .build();
        var functionURL = FunctionUrl.Builder.create(this, functionName + "Url")
          .function(lambdaFunctionAlias)
          .authType(FunctionUrlAuthType.NONE)
          .invokeMode(InvokeMode.BUFFERED)
          .cors(
            FunctionUrlCorsOptions.builder()
              .allowedOrigins(List.of("*"))
              .allowedMethods(List.of(HttpMethod.GET))
              .allowedHeaders(List.of("*"))
              .build()
          )
          .build();
        return new ProxyResourceParameters(functionName + "Resource", functionURL.getUrl(), ANY.name(), parameters);
      }).collect(ArrayList::new, List::add, List::addAll);
  }

  private void createProxyResource(ProxyResourceParameters proxyResourceParameters) {
    var parentProxyResource = restApi.getRoot().addResource(proxyResourceParameters.resourceId);
    var proxyResource = ProxyResource.Builder.create(this, proxyResourceParameters.resourceId + "ProxyResource")
      .parent(parentProxyResource)
      .anyMethod(false)
      .build();
    var integrationOptions = IntegrationOptions.builder()
      .requestParameters(
        Map.of(
          "integration.request.path.proxy", "method.request.path.proxy"
        )
      )
      .build();
    var httpIntegrationProps = HttpIntegrationProps.builder()
      .proxy(true)
      .httpMethod(proxyResourceParameters.httpMethod)
      .options(integrationOptions)
      .build();
    var methodOptions = MethodOptions.builder()
      .requestParameters(
        Map.of(
          "method.request.path.proxy", true
        )
      )
      .build();
    var httpIntegration = new HttpIntegration(proxyResourceParameters.baseUrl + "{proxy}", httpIntegrationProps);
    proxyResource.addMethod(proxyResourceParameters.httpMethod, httpIntegration, methodOptions);
    var proxyResourceUrl = restApi.urlForPath(proxyResource.getPath());
    CfnOutput.Builder.create(this, proxyResourceParameters.resourceId + "ProxyUrl")
      .value(proxyResourceUrl)
      .build();
    CfnOutput.Builder.create(this, proxyResourceParameters.resourceId + "Example")
      .value(proxyResourceUrl.replace("/{proxy+}", proxyResourceParameters.exampleRequest))
      .build();
  }

  private String getInlineCode(String path) {
    try {
      return new String(Files.readAllBytes(Path.of(path)));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
