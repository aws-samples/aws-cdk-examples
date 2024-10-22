package com.myorg;

import org.jetbrains.annotations.NotNull;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apigateway.*;
import software.amazon.awscdk.services.cognito.SignInAliases;
import software.amazon.awscdk.services.cognito.UserPool;
import software.amazon.awscdk.services.lambda.InlineCode;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SingletonFunction;
import software.constructs.Construct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class CognitoApiLambdaStack extends Stack {

  private record Authorizer(CfnAuthorizer authorizer) implements IAuthorizer {
    @Override
    public @NotNull String getAuthorizerId() {
      return authorizer.getRef();
    }
  }

  public CognitoApiLambdaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
    var helloWorldFunction = SingletonFunction.Builder.create(this, "helloWorldFunction")
      .functionName("helloWorldFunction")
      .code(InlineCode.fromInline(getInlineCode()))
      .handler("index.handler")
      .runtime(Runtime.PYTHON_3_12)
      .uuid("")
      .build();
    var helloWorldLambdaRestApi = LambdaRestApi.Builder.create(this, "helloWorldLambdaRestApi")
      .restApiName("Hello World API")
      .cloudWatchRole(true)
      .cloudWatchRoleRemovalPolicy(RemovalPolicy.DESTROY)
      .handler(helloWorldFunction)
      .proxy(false)
      .build();
    var signInAliases = SignInAliases.builder()
      .email(true)
      .build();
    var userPool = UserPool.Builder.create(this, "userPool")
      .signInAliases(signInAliases)
      .removalPolicy(RemovalPolicy.DESTROY)
      .build();
    var authorizer = new Authorizer(
      CfnAuthorizer.Builder.create(this, "cfnAuth")
        .restApiId(helloWorldLambdaRestApi.getRestApiId())
        .name("HelloWorldAPIAuthorizer")
        .type("COGNITO_USER_POOLS")
        .identitySource("method.request.header.Authorization")
        .providerArns(List.of(userPool.getUserPoolArn()))
        .build()
    );
    var helloResource = helloWorldLambdaRestApi.getRoot().addResource("HELLO");
    var methodOptions = MethodOptions.builder()
      .authorizationType(AuthorizationType.COGNITO)
      .authorizer(authorizer)
      .build();
    helloResource.addMethod("GET", new LambdaIntegration(helloWorldFunction), methodOptions);
  }

  private String getInlineCode() {
    try {
      return new String(Files.readAllBytes(Path.of("src/main/resources/lambda/hello-world.py")));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
