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

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Predicate;

public class EventBridgeLambdaTest {

  private static final Map<String, JsonNode> stackResourcesMap = new HashMap<>();

  public static String findResourceId(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return Optional.ofNullable(findResource(stackResources, matchMap))
      .map(Entry::getKey)
      .orElse(null);
  }

  public static Entry<String, JsonNode> findResource(Map<String, JsonNode> stackResources, Map<String, String> matchMap) {
    return stackResources.entrySet().stream()
      .filter(createResourcePredicate(matchMap))
      .findAny()
      .orElse(null);
  }

  public static Predicate<Entry<String, JsonNode>> createResourcePredicate(String expectedJsonPath, String expectedJsonValue) {
    return stackResourceEntry -> Optional.ofNullable(stackResourceEntry)
      .map(Entry::getValue)
      .flatMap(
        resource -> Optional.ofNullable(expectedJsonPath)
          .map(resource::at)
          .map(JsonNode::asText)
      ).filter(propertyValue -> propertyValue.equals(expectedJsonValue))
      .isPresent();
  }

  public static Predicate<Entry<String, JsonNode>> createResourcePredicate(Map<String, String> matchMap) {
    return Optional.ofNullable(matchMap)
      .map(Map::entrySet)
      .flatMap(
        matchEntrySet -> matchEntrySet.stream()
          .filter(Objects::nonNull)
          .filter(matchEntry -> StringUtils.isNotBlank(matchEntry.getKey()))
          .filter(matchEntry -> StringUtils.isNotBlank(matchEntry.getValue()))
          .map(matchEntry -> createResourcePredicate(matchEntry.getKey(), matchEntry.getValue()))
          .reduce(Predicate::and)
      ).orElseGet(() -> stackResourceEntry -> false);
  }

  @BeforeAll
  public static void setUp() {
    App app = App.Builder.create().build();
    StackProps stackProps = StackProps.builder().build();
    EventBridgeLambdaStack eventBridgeLambdaStack = new EventBridgeLambdaStack(app, "test", stackProps);
    Optional.of(app)
      .map(App::synth)
      .flatMap(
        cloudAssembly -> Optional.of(eventBridgeLambdaStack)
          .map(EventBridgeLambdaStack::getArtifactId)
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
            stackResourceEntry.getKey() != null &&
            !stackResourceEntry.getKey().isBlank() &&
            stackResourceEntry.getValue() != null &&
            !stackResourceEntry.getValue().isEmpty()
          ) {
            stackResourcesMap.put(stackResourceEntry.getKey(), stackResourceEntry.getValue());
          }
        })
      );
  }

  @Test
  @DisplayName("Test if the expected SNS topic is present in the resources of the stack.")
  public void testSNSTopic() {
    var topicMatchMap = Map.of(
      "/Type", "AWS::SNS::Topic",
      "/Properties/DisplayName", "Lambda SNS Topic"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, topicMatchMap));
  }

  @Test
  @DisplayName("Test if the expected SNS subscription is present in the resources of the stack.")
  public void testSNSSubscription() {
    // get the topic id required to check the SNS subscription
    String topicId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::SNS::Topic"));
    var subscriptionMatchMap = Map.of(
      "/Type", "AWS::SNS::Subscription",
      "/Properties/Protocol", "email",
      "/Properties/Endpoint/Ref", "email",
      "/Properties/TopicArn/Ref", topicId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, subscriptionMatchMap));
  }

  @Test
  @DisplayName("Test if the expected IAM role is present in the resources of the stack.")
  public void testIAMRole() {
    var roleMatchMap = Map.of(
      "/Type", "AWS::IAM::Role",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Action", "sts:AssumeRole",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/AssumeRolePolicyDocument/Statement/0/Principal/Service", "lambda.amazonaws.com"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, roleMatchMap));
  }

  @Test
  @DisplayName("Test if the expected IAM policy is present in the resources of the stack.")
  public void testIAMPolicy() {
    // get the IAM role id required to check the IAM policy
    String iamRoleId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::IAM::Role"));
    var policyMatchMap = Map.of(
      "/Type", "AWS::IAM::Policy",
      "/Properties/PolicyDocument/Statement/0/Action", "sns:publish",
      "/Properties/PolicyDocument/Statement/0/Effect", "Allow",
      "/Properties/PolicyDocument/Statement/0/Resource", "*",
      "/Properties/Roles/0/Ref", iamRoleId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, policyMatchMap));
  }

  @Test
  @DisplayName("Test if the expected lambda function is present in the resources of the stack.")
  public void testLambdaFunction() {
    // get the IAM role id required to check the lambda function
    String iamRoleId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::IAM::Role"));
    // get the topic id required to check the lambda function
    String topicId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::SNS::Topic"));
    var lambdaMatchMap = Map.of(
      "/Type", "AWS::Lambda::Function",
      "/Properties/Environment/Variables/TOPIC_ARN/Ref", topicId,
      "/Properties/Role/Fn::GetAtt/0", iamRoleId,
      "/Properties/Handler", "index.main",
      "/Properties/Runtime", "python3.9",
      "/Properties/Timeout", "300"
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, lambdaMatchMap));
  }

  @Test
  @DisplayName("Test if the expected events rule is present in the resources of the stack.")
  public void testEventsRule() {
    // get the lambda function id required to check the events rule
    String lambdaId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::Lambda::Function"));
    var ruleMatchMap = Map.of(
      "/Type", "AWS::Events::Rule",
      "/Properties/ScheduleExpression", "cron(* * ? * * *)",
      "/Properties/Targets/0/Arn/Fn::GetAtt/0", lambdaId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, ruleMatchMap));
  }

  @Test
  @DisplayName("Test if the expected lambda permission is present in the resources of the stack.")
  public void testLambdaPermission() {
    // get the lambda function id required to check the lambda permission
    String lambdaId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::Lambda::Function"));
    // get the events rule id required to check the lambda permission
    String ruleId = findResourceId(stackResourcesMap, Map.of("/Type", "AWS::Events::Rule"));
    var lambdaPermissionMatchMap = Map.of(
      "/Type", "AWS::Lambda::Permission",
      "/Properties/Action", "lambda:InvokeFunction",
      "/Properties/Principal", "events.amazonaws.com",
      "/Properties/FunctionName/Fn::GetAtt/0", lambdaId,
      "/Properties/SourceArn/Fn::GetAtt/0", ruleId
    );
    Assertions.assertNotNull(findResource(stackResourcesMap, lambdaPermissionMatchMap));
  }
}
