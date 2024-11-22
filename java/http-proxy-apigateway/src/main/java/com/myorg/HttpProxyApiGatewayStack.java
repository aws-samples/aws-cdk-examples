package com.myorg;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apigateway.*;
import software.constructs.Construct;

import java.util.List;
import java.util.Map;

public class HttpProxyApiGatewayStack extends Stack {

  public record ProxyResourceParameters(String resourceId, String baseUrl, String httpMethod, String exampleRequest) {

  }

  private final RestApi restApi;

  public HttpProxyApiGatewayStack(final Construct scope, final String id, final StackProps props, List<ProxyResourceParameters> proxyResourceParameters) {
    super(scope, id, props);
    restApi = RestApi.Builder.create(this, "RestApi")
      .restApiName("RestApi")
      .cloudWatchRole(true)
      .cloudWatchRoleRemovalPolicy(RemovalPolicy.DESTROY)
      .endpointTypes(List.of(EndpointType.EDGE))
      .build();
    proxyResourceParameters.forEach(this::createProxyResource);
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
    var httpIntegration = new HttpIntegration(proxyResourceParameters.baseUrl + "/{proxy}", httpIntegrationProps);
    proxyResource.addMethod(proxyResourceParameters.httpMethod, httpIntegration, methodOptions);
    var proxyResourceUrl = restApi.urlForPath(proxyResource.getPath());
    CfnOutput.Builder.create(this, proxyResourceParameters.resourceId + "ProxyEndPointAnyRequestTemplate")
      .value(proxyResourceUrl)
      .build();
    CfnOutput.Builder.create(this, proxyResourceParameters.resourceId + "ProxyEndPointGetRequestExample")
      .value(proxyResourceUrl.replace("/{proxy+}", proxyResourceParameters.exampleRequest))
      .build();
  }
}
