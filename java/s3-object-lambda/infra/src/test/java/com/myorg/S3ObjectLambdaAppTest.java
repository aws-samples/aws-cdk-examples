package com.myorg;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Template;

import static com.myorg.TestUtils.TestConstants.*;
import static com.myorg.TestUtils.isResourceInStack;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class S3ObjectLambdaAppTest {

  private static S3ObjectLambdaApp s3ObjectLambdaApp;

  @BeforeAll
  public static void setUp() {
    s3ObjectLambdaApp = new S3ObjectLambdaApp();
  }

  @Test
  public void testCreateStack() {
    var stackProps = StackProps.builder()
      .build();
    var stack = s3ObjectLambdaApp.createStack(stackProps);
    var template = Template.fromStack(stack);
    assertTrue(isResourceInStack(BUCKET_MATCH_PAIR, template), "The expected S3 bucket is not present in the resources of the stack.");
    assertTrue(isResourceInStack(BUCKET_POLICY_MATCH_PAIR, template), "The expected S3 bucket policy is not present in the resources of the stack.");
    assertTrue(isResourceInStack(IAM_ROLE_MATCH_PAIR, template), "The expected IAM role for the lambda function is not present in the resources of the stack.");
    assertTrue(isResourceInStack(IAM_POLICY_MATCH_PAIR, template), "The expected IAM policy for the lambda function is not present in the resources of the stack.");
    assertTrue(isResourceInStack(LAMBDA_FUNCTION_MATCH_PAIR, template), "The expected lambda function is not present in the resources of the stack.");
    assertTrue(isResourceInStack(LAMBDA_PERMISSION_MATCH_PAIR, template), "The expected lambda permission is not present in the resources of the stack.");
    assertTrue(isResourceInStack(S3_ACCESS_POINT_MATCH_PAIR, template), "The expected S3 access point is not present in the resources of the stack.");
    assertTrue(isResourceInStack(S3_OBJECT_LAMBDA_ACCESS_POINT, template), "The expected S3 object lambda access point is not present in the resources of the stack.");
  }
}
