package com.myorg;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.platform.commons.util.StringUtils;
import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.cxapi.CloudFormationStackArtifact;

import java.util.*;
import java.util.stream.Stream;

import static com.myorg.TestUtils.*;

public class HttpProxyApiGatewayTest {

  private static final Map<String, JsonNode> stackResourcesMap = new HashMap<>();

  @BeforeAll
  public static void setUp() {
    var app = App.Builder.create().build();
    var stackProps = StackProps.builder()
      .stackName("HttpProxyApiGatewayStack")
      .build();
    var httpProxyApiGatewayStack = new HttpProxyApiGatewayStack(app, "HttpProxyApiGatewayStack", stackProps);
    Optional.of(app)
      .map(App::synth)
      .flatMap(
        cloudAssembly -> Optional.of(httpProxyApiGatewayStack)
          .map(HttpProxyApiGatewayStack::getArtifactId)
          .map(cloudAssembly::getStackArtifact)
          .map(CloudFormationStackArtifact::getTemplate)
      ).flatMap(
        template -> Optional.of(new ObjectMapper())
          .map(objectMapper -> objectMapper.<JsonNode>valueToTree(template))
          .map(jsonNode -> jsonNode.at("/Resources"))
          .map(JsonNode::fields)
      ).ifPresent(stackResourceIterator -> stackResourceIterator.forEachRemaining(
        stackResourceEntry -> {
          if (stackResourceEntry != null &&
            StringUtils.isNotBlank(stackResourceEntry.getKey()) &&
            stackResourceEntry.getValue() != null &&
            !stackResourceEntry.getValue().isEmpty()
          ) {
            stackResourcesMap.put(stackResourceEntry.getKey(), stackResourceEntry.getValue());
          }
        })
      );
  }

  @Test
  @DisplayName("Test if the expected REST API is present in the resources of the stack.")
  public void testRestApi() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi",
      "/Properties/EndpointConfiguration/Types/0", "EDGE",
      "/Properties/Name", "RestApi"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, restApiMatchMap));
  }

  @Test
  @DisplayName("Test if the expected IAM role for the REST API is present in the resources of the stack.")
  public void testRestAPIIamRole() {
    var iamRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "apigateway.amazonaws.com",
      "/Properties/AssumeRolePolicyDocument/Version", "2012-10-17",
      "/Properties/ManagedPolicyArns/0/Fn::Join/0", "",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/0", "arn:",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/1/Ref", "AWS::Partition",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs",
      "/DeletionPolicy", "Delete"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, iamRoleMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway account is present in the resources of the stack.")
  public void testApiGatewayAccount() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restApiId = findResourceId(stackResourcesMap, restApiMatchMap);
    var iamRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "apigateway.amazonaws.com",
      "/Properties/AssumeRolePolicyDocument/Version", "2012-10-17",
      "/Properties/ManagedPolicyArns/0/Fn::Join/0", "",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/0", "arn:",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/1/Ref", "AWS::Partition",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs",
      "/DeletionPolicy", "Delete"
    );
    var iamRoleId = findResourceId(stackResourcesMap, iamRoleMatchMap);
    var apiGatewayAccountMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Account",
      "/Properties/CloudWatchRoleArn/Fn::GetAtt/0", iamRoleId,
      "/Properties/CloudWatchRoleArn/Fn::GetAtt/1", "Arn",
      "/DependsOn/0", restApiId,
      "/UpdateReplacePolicy", "Delete",
      "/DeletionPolicy", "Delete"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayAccountMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway deployment is present in the resources of the stack.")
  public void testApiGatewayDeployment() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restApiId = findResourceId(stackResourcesMap, restApiMatchMap);
    var apiGatewayDeploymentMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Deployment",
      "/Properties/RestApiId/Ref", restApiId
    );
    var apiGatewayDeployment = findResource(stackResourcesMap, apiGatewayDeploymentMatchMap);
    Assertions.assertNotNull(apiGatewayDeployment);
    var dependsOnActualIds = extractAsStringArray(apiGatewayDeployment, "/DependsOn");
    var dependsOnExpectedIds = Stream.of(
        findResourcesIds(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Resource")),
        findResourcesIds(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Method"))
      )
      .flatMap(Set::stream)
      .collect(HashSet::new, Set::add, Set::addAll);
    Assertions.assertEquals(dependsOnExpectedIds, dependsOnActualIds);
  }

  @Test
  @DisplayName("Test if the expected API Gateway stage is present in the resources of the stack.")
  public void testApiGatewayStage() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restApiId = findResourceId(stackResourcesMap, restApiMatchMap);
    var apiGatewayDeploymentMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Deployment"
    );
    var apiGatewayDeploymentId = findResourceId(stackResourcesMap, apiGatewayDeploymentMatchMap);
    var apiGatewayAccount = Map.of(
      "/Type", "AWS::ApiGateway::Account"
    );
    var apiGatewayAccountId = findResourceId(stackResourcesMap, apiGatewayAccount);
    var stageMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Stage",
      "/Properties/RestApiId/Ref", restApiId,
      "/Properties/DeploymentId/Ref", apiGatewayDeploymentId,
      "/Properties/StageName", "prod",
      "/DependsOn/0", apiGatewayAccountId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, stageMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway resources are present in the resources of the stack.")
  public void testApiGatewayResources() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restApiId = findResourceId(stackResourcesMap, restApiMatchMap);
    var apiGatewayResourcesMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Resource",
      "/Properties/RestApiId/Ref", restApiId
    );
    Long expectedApiGatewayResources = 4L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, apiGatewayResourcesMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(resourcesCont -> resourcesCont.equals(expectedApiGatewayResources))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected API Gateway methods are present in the resources of the stack.")
  public void testApiGatewayMethods() {
    var restApiMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restApiId = findResourceId(stackResourcesMap, restApiMatchMap);
    var apiGatewayMethodsMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Method",
      "/Properties/AuthorizationType", "NONE",
      "/Properties/HttpMethod", "ANY",
      "/Properties/Integration/IntegrationHttpMethod", "ANY",
      "/Properties/Integration/RequestParameters/integration.request.path.proxy", "method.request.path.proxy",
      "/Properties/Integration/Type", "HTTP_PROXY",
      "/Properties/RequestParameters/method.request.path.proxy", "true",
      "/Properties/RestApiId/Ref", restApiId
    );
    Long expectedApiGatewayMethodsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, apiGatewayMethodsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedApiGatewayMethodsCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected IAM roles for the test lambdas are present in the resources of the stack.")
  public void testLambdaFunctionsIAMRoles() {
    var lambdaFunctionsIAMRolesMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "lambda.amazonaws.com",
      "/Properties/AssumeRolePolicyDocument/Version", "2012-10-17",
      "/Properties/ManagedPolicyArns/0/Fn::Join/0", "",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/0", "arn:",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/1/Ref", "AWS::Partition",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    );
    Long expectedLambdaFunctionsIAMRolesCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaFunctionsIAMRolesMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaFunctionsIAMRolesCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected lambda functions are present in the resources of the stack.")
  public void testLambdaFunctions() {
    var lambdaFunctionsMatchMap = Map.of(
      "/Type", "AWS::Lambda::Function",
      "/Properties/Runtime", "python3.12"
    );
    Long expectedLambdaFunctionsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaFunctionsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaFunctionsCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected lambda versions are present in the resources of the stack.")
  public void testLambdaVersions() {
    var lambdaVersionsMatchMap = Map.of(
      "/Type", "AWS::Lambda::Version"
    );
    Long expectedLambdaVersionsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaVersionsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaVersionsCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected lambda aliases are present in the resources of the stack.")
  public void testLambdaAliases() {
    var lambdaAliasesMatchMap = Map.of(
      "/Type", "AWS::Lambda::Alias",
      "/Properties/Name", "Prod"
    );
    Long expectedLambdaAliasesCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaAliasesMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaAliasesCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected lambda permissions are present in the resources of the stack.")
  public void testLambdaPermissions() {
    var lambdaPermissionsMatchMap = Map.of(
      "/Type", "AWS::Lambda::Permission",
      "/Properties/Action", "lambda:InvokeFunctionUrl",
      "/Properties/FunctionUrlAuthType", "NONE",
      "/Properties/Principal", "*"
    );
    Long expectedLambdaPermissionsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaPermissionsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaPermissionsCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected lambda function URLs are present in the resources of the stack.")
  public void testLambdaFunctionURLs() {
    var lambdaFunctionsURLsMatchMap = Map.of(
      "/Type", "AWS::Lambda::Url",
      "/Properties/AuthType", "NONE",
      "/Properties/InvokeMode", "BUFFERED",
      "/Properties/Qualifier", "Prod",
      "/Properties/Cors/AllowHeaders/0", "*",
      "/Properties/Cors/AllowMethods/0", "GET",
      "/Properties/Cors/AllowOrigins/0", "*"
    );
    Long expectedLambdaFunctionsURLsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaFunctionsURLsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(methodsCont -> methodsCont.equals(expectedLambdaFunctionsURLsCount))
        .isPresent()
    );
  }

}
