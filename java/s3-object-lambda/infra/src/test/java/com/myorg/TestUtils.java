package com.myorg;

import lombok.Builder;
import org.junit.platform.commons.util.StringUtils;
import software.amazon.awscdk.assertions.Template;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

public class TestUtils {

  @Builder(builderClassName = "MatchPairBuilder", setterPrefix = "with")
  public record MatchPair(String type, Object props) {

  }

  public static class TestConstants {
    public static final MatchPair BUCKET_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::S3::Bucket")
      .withProps(
        Map.of(
          "UpdateReplacePolicy", "Retain",
          "DeletionPolicy", "Retain",
          "Properties", Map.of(
            "AccessControl", "BucketOwnerFullControl",
            "BucketEncryption", Map.of(
              "ServerSideEncryptionConfiguration", List.of(
                Map.of(
                  "ServerSideEncryptionByDefault", Map.of(
                    "SSEAlgorithm", "AES256"
                  )
                )
              )
            ),
            "PublicAccessBlockConfiguration", Map.of(
              "BlockPublicAcls", true,
              "BlockPublicPolicy", true,
              "IgnorePublicAcls", true,
              "RestrictPublicBuckets", true
            )
          )
        )
      )
      .build();
    public static final MatchPair BUCKET_POLICY_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::S3::BucketPolicy")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "PolicyDocument", Map.of(
              "Statement", List.of(
                Map.of(
                  "Action", "*",
                  "Condition", Map.of(
                    "StringEquals", Map.of(
                      "s3:DataAccessPointAccount", Map.of(
                        "Ref", "AWS::AccountId"
                      )
                    )
                  ),
                  "Effect", "Allow",
                  "Principal", Map.of(
                    "AWS", "*"
                  )
                )
              ),
              "Version", "2012-10-17"
            )
          )
        )
      )
      .build();
    public static final MatchPair IAM_ROLE_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::IAM::Role")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "AssumeRolePolicyDocument", Map.of(
              "Statement", List.of(
                Map.of(
                  "Action", "sts:AssumeRole",
                  "Effect", "Allow",
                  "Principal", Map.of(
                    "Service", "lambda.amazonaws.com"
                  )
                )
              ),
              "Version", "2012-10-17"
            ),
            "ManagedPolicyArns", List.of(
              Map.of(
                "Fn::Join", List.of(
                  "", List.of(
                    "arn:",
                    Map.of(
                      "Ref", "AWS::Partition"
                    ),
                    ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                  )
                )
              )
            )
          )
        )
      )
      .build();
    public static final MatchPair IAM_POLICY_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::IAM::Policy")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "PolicyDocument", Map.of(
              "Statement", List.of(
                Map.of(
                  "Action", "s3-object-lambda:WriteGetObjectResponse",
                  "Effect", "Allow",
                  "Resource", "*"
                )
              ),
              "Version", "2012-10-17"
            )
          )
        )
      )
      .build();
    public static final MatchPair LAMBDA_FUNCTION_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::Lambda::Function")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "FunctionName", "S3ObjectLambdaFunction",
            "Handler", "com.myorg.S3ObjectLambdaTransformer::handleRequest",
            "MemorySize", 2048,
            "Runtime", "java17"
          )
        )
      )
      .build();
    public static final MatchPair LAMBDA_PERMISSION_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::Lambda::Permission")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "Action", "lambda:InvokeFunction",
            "Principal", Map.of(
              "Ref", "AWS::AccountId"
            ),
            "SourceAccount", Map.of(
              "Ref", "AWS::AccountId"
            )
          )
        )
      )
      .build();
    public static final MatchPair S3_ACCESS_POINT_MATCH_PAIR = MatchPair.builder()
      .withType("AWS::S3::AccessPoint")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "Name", "s3-access-point",
            "Policy", Map.of(
              "Statement", List.of(
                Map.of(
                  "Action", "s3:GetObject",
                  "Effect", "Allow",
                  "Resource", Map.of(
                    "Fn::Join", List.of(
                      "",
                      List.of(
                        "arn:aws:s3:",
                        Map.of(
                          "Ref", "AWS::Region"
                        ),
                        ":",
                        Map.of(
                          "Ref", "AWS::AccountId"
                        ),
                        ":accesspoint/s3-access-point/object/*"
                      )
                    )
                  ),
                  "Sid", "S3ObjectLambdaAccessPointPolicyStatement"
                )
              ),
              "Version", "2012-10-17"
            )
          )
        )
      )
      .build();
    public static final MatchPair S3_OBJECT_LAMBDA_ACCESS_POINT = MatchPair.builder()
      .withType("AWS::S3ObjectLambda::AccessPoint")
      .withProps(
        Map.of(
          "Properties", Map.of(
            "Name", "object-lambda-access-point",
            "ObjectLambdaConfiguration", Map.of(
              "SupportingAccessPoint", Map.of(
                "Fn::Join", List.of(
                  "",
                  List.of(
                    "arn:aws:s3:",
                    Map.of(
                      "Ref", "AWS::Region"
                    ),
                    ":",
                    Map.of(
                      "Ref", "AWS::AccountId"
                    ),
                    ":accesspoint/s3-access-point"
                  )
                )
              ),
              "TransformationConfigurations", List.of(
                Map.of(
                  "Actions", List.of(
                    "GetObject"
                  ),
                  "ContentTransformation", Map.of(
                    "AwsLambda", Map.of()
                  )
                )
              )
            )
          )
        )
      )
      .build();
  }

  public static boolean isResourceInStack(MatchPair matchPair, Template template) {
    return Optional.ofNullable(matchPair)
      .filter(pair -> StringUtils.isNotBlank(pair.type))
      .filter(pair -> pair.props != null)
      .map(pair -> template.findResources(pair.type, pair.props))
      .map(Map::entrySet)
      .map(Set::stream)
      .map(Stream::count)
      .filter(count -> count == 1)
      .isPresent();
  }


}
