package com.myorg;

import software.amazon.awscdk.*;
import software.amazon.awscdk.services.iam.*;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Permission;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketAccessControl;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.amazon.awscdk.services.s3.assets.AssetOptions;
import software.constructs.Construct;
import software.amazon.awscdk.services.s3objectlambda.CfnAccessPoint;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import static java.util.Collections.singletonList;
import static software.amazon.awscdk.BundlingOutput.ARCHIVED;
import static software.amazon.awscdk.services.s3objectlambda.CfnAccessPoint.*;

public class S3ObjectLambdaStack extends Stack {
  private static final String S3_ACCESS_POINT_NAME = "s3-access-point";
  private static final String OBJECT_LAMBDA_ACCESS_POINT_NAME = "object-lambda-access-point";

  /**
   * Constructs a new S3ObjectLambdaStack.
   */
  public S3ObjectLambdaStack(final Construct scope, final String id, final StackProps props) {
  super(scope, id, props);

    // Construct the access point ARN using the region, account ID and access point name
    var accessPoint = "arn:aws:s3:" + Aws.REGION + ":" + Aws.ACCOUNT_ID + ":accesspoint/" + S3_ACCESS_POINT_NAME;
    
    // Create a new S3 bucket with secure configuration including:
    var s3ObjectLambdaBucket = Bucket.Builder.create(this, "S3ObjectLambdaBucket")
      .removalPolicy(RemovalPolicy.RETAIN)
      .autoDeleteObjects(false)
      .accessControl(BucketAccessControl.BUCKET_OWNER_FULL_CONTROL)
      .encryption(BucketEncryption.S3_MANAGED)
      .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
      .build();

    // Create bucket policy statement allowing access through access points
    var s3ObjectLambdaBucketPolicyStatement = PolicyStatement.Builder.create()
      .actions(List.of("*"))
      .principals(List.of(new AnyPrincipal()))
      .resources(List.of(
        s3ObjectLambdaBucket.getBucketArn(),
        s3ObjectLambdaBucket.arnForObjects("*")
      ))
      .conditions(
        Map.of(
          "StringEquals", Map.of(
            "s3:DataAccessPointAccount", Aws.ACCOUNT_ID
          )
        )
      )
      .build();

    // Attach the policy to the bucket
    s3ObjectLambdaBucket.addToResourcePolicy(s3ObjectLambdaBucketPolicyStatement);

    // Create the Lambda function that will transform objects
    var s3ObjectLambdaFunction = createS3ObjectLambdaFunction();

    // Add permission for Lambda to write GetObject responses for s3 object
    var s3ObjectLambdaFunctionPolicyStatement = PolicyStatement.Builder.create()
      .effect(Effect.ALLOW)
      .resources(List.of("*"))
      .actions(List.of("s3-object-lambda:WriteGetObjectResponse"))
      .build();
    s3ObjectLambdaFunction.addToRolePolicy(s3ObjectLambdaFunctionPolicyStatement);

    // Add permission for the account root to invoke the Lambda function
    var s3ObjectLambdaFunctionPermission = Permission.builder()
      .action("lambda:InvokeFunction")
      .principal(new AccountRootPrincipal())
      .sourceAccount(Aws.ACCOUNT_ID)
      .build();
    s3ObjectLambdaFunction.addPermission("S3ObjectLambdaPermission", s3ObjectLambdaFunctionPermission);

    // Create policy allowing Lambda function to get objects through the access point
    var s3ObjectLambdaAccessPointPolicyStatement = PolicyStatement.Builder.create()
      .sid("S3ObjectLambdaAccessPointPolicyStatement")
      .effect(Effect.ALLOW)
      .actions(List.of("s3:GetObject"))
      .principals(List.of(
          new ArnPrincipal(Objects.requireNonNull(s3ObjectLambdaFunction.getRole()).getRoleArn())
        )
      )
      .resources(List.of(accessPoint + "/object/*"))
      .build();

    // Create policy document containing the access point policy
    var s3ObjectLambdaAccessPointPolicyDocument = PolicyDocument.Builder.create()
      .statements(List.of(
        s3ObjectLambdaAccessPointPolicyStatement
      ))
      .build();

    // Create the S3 access point for direct bucket access
    software.amazon.awscdk.services.s3.CfnAccessPoint.Builder.create(this, "S3ObjectLambdaS3AccessPoint")
      .bucket(s3ObjectLambdaBucket.getBucketName())
      .name(S3_ACCESS_POINT_NAME)
      .policy(s3ObjectLambdaAccessPointPolicyDocument)
      .build();

    // Create the Object Lambda access point that will transform objects
    var s3ObjectLambdaAccessPoint = CfnAccessPoint.Builder.create(this, "S3ObjectLambdaAccessPoint")
      .name(OBJECT_LAMBDA_ACCESS_POINT_NAME)
      .objectLambdaConfiguration(ObjectLambdaConfigurationProperty.builder()
        .supportingAccessPoint(accessPoint)
        .transformationConfigurations(List.of(
            TransformationConfigurationProperty.builder()
              .actions(List.of("GetObject"))
              .contentTransformation(
                Map.of(
                  "AwsLambda", Map.of(
                    "FunctionArn", s3ObjectLambdaFunction.getFunctionArn()
                  )
                )
              )
              .build()
          )
        )
        .build()
      )
      .build();
    CfnOutput.Builder.create(this, "s3ObjectLambdaBucketArn")
      .value(s3ObjectLambdaBucket.getBucketArn())        // Export bucket ARN
      .build();
    CfnOutput.Builder.create(this, "s3ObjectLambdaFunctionArn")
      .value(s3ObjectLambdaFunction.getFunctionArn())    // Export Lambda function ARN
      .build();
    CfnOutput.Builder.create(this, "s3ObjectLambdaAccessPointArn")
      .value(s3ObjectLambdaAccessPoint.getAttrArn())    // Export access point ARN
      .build();

    // Create output with Console URL for easy access to the Lambda access point
    CfnOutput.Builder.create(this, "s3ObjectLambdaAccessPointUrl")
      .value("https://console.aws.amazon.com/s3/olap/" + Aws.ACCOUNT_ID + "/" + OBJECT_LAMBDA_ACCESS_POINT_NAME + "?region=" + Aws.REGION)
      .build();
  }

  /**
   * Creates the Lambda function that will process S3 Object Lambda requests.
   * This method configures the function's runtime, code, and build process.
   * 
   * @return A Lambda Function construct configured for S3 Object Lambda processing
   */
  private Function createS3ObjectLambdaFunction() {
    // Define Maven packaging commands to build the Lambda function
    List<String> packagingInstructions = List.of(
      "/bin/sh",
      "-c",
      // Build the project and copy the JAR to the asset output directory
      "mvn -e -q clean package && cp /asset-input/target/lambda-1.0-SNAPSHOT.jar /asset-output/"
    );
    // Configure the bundling options for packaging the Lambda function
    var builderOptions = BundlingOptions.builder()
      .command(packagingInstructions)  // Set the Maven build commands
      .image(Runtime.JAVA_17.getBundlingImage())  // Use Java 17 runtime image
      .volumes(
        singletonList(
          DockerVolume.builder()
            .hostPath(System.getProperty("user.home") + "/.m2/")
            .containerPath("/root/.m2/")
            .build()
        ))
      .user("root")
      .outputType(ARCHIVED)
      .build();

    // Create the Lambda function with specified configuration
    return Function.Builder.create(this, "S3ObjectLambdaFunction")
      .runtime(Runtime.JAVA_17)           // Set Java 17 runtime
      .functionName("S3ObjectLambdaFunction")  // Set function name
      .memorySize(2048)                   // Allocate 2GB memory
      .code(
        Code.fromAsset(
          "../lambda/",
          AssetOptions.builder().bundling(builderOptions).build()
        )
      )
      .handler("com.myorg.S3ObjectLambdaTransformer::handleRequest")
      .build();
  }
}