package software.amazon.awscdk.examples;

import java.util.UUID;
import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.events.Rule;
import software.amazon.awscdk.services.events.Schedule;
import software.amazon.awscdk.services.events.targets.LambdaFunction;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SingletonFunction;

/** Lambda Cron CDK example for Java! */
class LambdaCronStack extends Stack {
  public LambdaCronStack(final Construct parent, final String name) {
    super(parent, name);

    SingletonFunction lambdaFunction =
        SingletonFunction.Builder.create(this, "cdk-lambda-cron")
            .description("Lambda which prints \"I'm running\"")
            .code(Code.fromInline("def main(event, context):\n" + "    print(\"I'm running!\")\n"))
            .handler("index.main")
            .timeout(Duration.seconds(300))
            .runtime(Runtime.PYTHON_3_9)
            .uuid(UUID.randomUUID().toString())
            .build();

    Rule rule =
        Rule.Builder.create(this, "cdk-lambda-cron-rule")
            .description("Run every day at 6PM UTC")
            .schedule(Schedule.expression("cron(0 18 ? * MON-FRI *)"))
            .build();

    rule.addTarget(new LambdaFunction(lambdaFunction));
  }
}
