package com.myorg;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.cxapi.CloudFormationStackArtifact;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import static com.myorg.TestUtils.*;
import static org.junit.platform.commons.util.StringUtils.isNotBlank;

public class CognitoApiLambdaTest {

  private static final Map<String, JsonNode> stackResourcesMap = new HashMap<>();

  @BeforeAll
  public static void setUp() {
    var app = App.Builder.create().build();
    var stackProps = StackProps.builder().build();
    var cognitoApiLambdaStack = new CognitoApiLambdaStack(app, "test", stackProps);
    Optional.of(app)
      .map(App::synth)
      .flatMap(
        cloudAssembly -> Optional.of(cognitoApiLambdaStack)
          .map(CognitoApiLambdaStack::getArtifactId)
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
            isNotBlank(stackResourceEntry.getKey()) &&
            stackResourceEntry.getValue() != null &&
            !stackResourceEntry.getValue().isEmpty()
          ) {
            stackResourcesMap.put(stackResourceEntry.getKey(), stackResourceEntry.getValue());
          }
        })
      );
  }

  @Test
  @DisplayName("Test if the expected IAM role required for the lambda function is present in the resources of the stack.")
  public void testLambdaFunctionRole() {
    var lambdaIAMRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "lambda.amazonaws.com",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, lambdaIAMRoleMatchMap));
  }

  @Test
  @DisplayName("Test if the expected lambda function is present in the resources of the stack.")
  public void testLambdaFunction() {
    var lambdaIAMRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    );
    var lambdaIAMRoleId = findResourceId(stackResourcesMap, lambdaIAMRoleMatchMap);
    var lambdaMatchMap = Map.of(
      "/Type", "AWS::Lambda::Function",
      "/Properties/FunctionName", "helloWorldFunction",
      "/Properties/Role/Fn::GetAtt/0", lambdaIAMRoleId,
      "/Properties/Handler", "index.handler",
      "/Properties/Runtime", "python3.12"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, lambdaMatchMap));
  }

  @Test
  @DisplayName("Test if the expected Rest API is present in the resources of the stack.")
  public void testRestAPI() {
    var restAPIMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi",
      "/Properties/Name", "Hello World API"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, restAPIMatchMap));
  }

  @Test
  @DisplayName("Test if the expected IAM Role required for the Rest API is present in the resources of the stack.")
  public void testRestApiRole() {
    var restAPIRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "apigateway.amazonaws.com",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, restAPIRoleMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway account is present in the resources of the stack.")
  public void testAPIGatewayAccount() {
    var restAPIMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::RestApi"
    );
    var restAPIId = findResourceId(stackResourcesMap, restAPIMatchMap);
    var restAPIRoleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/ManagedPolicyArns/0/Fn::Join/1/2", ":iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
    );
    var restAPIRoleId = findResourceId(stackResourcesMap, restAPIRoleMatchMap);
    var apiGatewayAccountMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Account",
      "/Properties/CloudWatchRoleArn/Fn::GetAtt/0", restAPIRoleId,
      "/DependsOn/0", restAPIId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayAccountMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway deployment is present in the resources of the stack.")
  public void testAPIGatewayDeployment() {
    var apiGatewayResourceId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Resource"));
    var apiGatewayMethodId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Method"));
    var restAPIId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::RestApi"));
    var apiGatewayDeploymentMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Deployment",
      "/Properties/RestApiId/Ref", restAPIId,
      "/DependsOn/0", apiGatewayMethodId,
      "/DependsOn/1", apiGatewayResourceId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayDeploymentMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway stage is present in the resources of the stack.")
  public void testAPIGatewayStage() {
    var apiGatewayAccountId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Account"));
    var apiGatewayDeploymentId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Deployment"));
    var restAPIId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::RestApi"));
    var apiGatewayStageMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Stage",
      "/Properties/DeploymentId/Ref", apiGatewayDeploymentId,
      "/Properties/RestApiId/Ref", restAPIId,
      "/Properties/StageName", "prod",
      "/DependsOn/0", apiGatewayAccountId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayStageMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway resource is present in the resources of the stack.")
  public void testAPIGatewayResource() {
    var restAPIId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::RestApi"));
    var apiGatewayResourceMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Resource",
      "/Properties/ParentId/Fn::GetAtt/0", restAPIId,
      "/Properties/PathPart", "HELLO",
      "/Properties/RestApiId/Ref", restAPIId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayResourceMatchMap));
  }

  @Test
  @DisplayName("Test if the expected Lambda permissions are present in the resources of the stack.")
  public void testLambdaPermissions() {
    var lambdaFunctionId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::Lambda::Function"));
    var lambdaPermissionsMatchMap = Map.of(
      "/Type", "AWS::Lambda::Permission",
      "/Properties/Action", "lambda:InvokeFunction",
      "/Properties/FunctionName/Fn::GetAtt/0", lambdaFunctionId
    );
    Long expectedPermissionsCount = 2L;
    Assertions.assertTrue(
      Optional.ofNullable(findResources(stackResourcesMap, lambdaPermissionsMatchMap))
        .map(Map::entrySet)
        .map(Set::stream)
        .map(Stream::count)
        .filter(permissionsCont -> permissionsCont.equals(expectedPermissionsCount))
        .isPresent()
    );
  }

  @Test
  @DisplayName("Test if the expected API Gateway method is present in the resources of the stack.")
  public void testAPIGatewayMethod() {
    var apiGatewayResourceId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Resource"));
    var restAPIId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::RestApi"));
    var authorizerId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::Authorizer"));
    var apiGatewayMethodMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Method",
      "/Properties/AuthorizationType", "COGNITO_USER_POOLS",
      "/Properties/AuthorizerId/Ref", authorizerId,
      "/Properties/HttpMethod", "GET",
      "/Properties/ResourceId/Ref", apiGatewayResourceId,
      "/Properties/RestApiId/Ref", restAPIId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayMethodMatchMap));
  }

  @Test
  @DisplayName("Test if the expected Cognito user pool is present in the resources of the stack.")
  public void testCognitoUserPool() {
    var cognitoUserPoolMatchMap = Map.of(
      "/Type", "AWS::Cognito::UserPool",
      "/Properties/AutoVerifiedAttributes/0", "email",
      "/Properties/UsernameAttributes/0", "email"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, cognitoUserPoolMatchMap));
  }

  @Test
  @DisplayName("Test if the expected API Gateway authorizer is present in the resources of the stack.")
  public void testAPIGatewayAuthorizer() {
    var restAPIId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::ApiGateway::RestApi"));
    var cognitoUserPoolId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::Cognito::UserPool"));
    var apiGatewayAuthorizerMatchMap = Map.of(
      "/Type", "AWS::ApiGateway::Authorizer",
      "/Properties/IdentitySource", "method.request.header.Authorization",
      "/Properties/Name", "HelloWorldAPIAuthorizer",
      "/Properties/ProviderARNs/0/Fn::GetAtt/0", cognitoUserPoolId,
      "/Properties/RestApiId/Ref", restAPIId,
      "/Properties/Type", "COGNITO_USER_POOLS"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, apiGatewayAuthorizerMatchMap));
  }
}
