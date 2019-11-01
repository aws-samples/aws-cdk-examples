package software.amazon.awscdk.examples;

import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Duration;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.services.events.Rule;
import software.amazon.awscdk.services.events.RuleProps;
import software.amazon.awscdk.services.events.Schedule;
import software.amazon.awscdk.services.events.targets.LambdaFunction;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SingletonFunction;
import software.amazon.awscdk.services.lambda.SingletonFunctionProps;

import java.util.UUID;

/**
 * Lambda Cron CDK example for Java!
 */
class LambdaCronStack extends Stack {
    public LambdaCronStack(final Construct parent, final String name) {
        super(parent, name);

        SingletonFunction lambdaFunction = new SingletonFunction(this, "cdk-lambda-cron",
                SingletonFunctionProps.builder()
                        .description("Lambda which prints \"I'm running\"")
                        .code(Code.fromInline(
                                "def main(event, context):\n" +
                                        "    print(\"I'm running!\")\n"))
                        .handler("index.main")
                        .timeout(Duration.seconds(300))
                        .runtime(Runtime.PYTHON_2_7)
                        .uuid(UUID.randomUUID().toString())
                        .build()
        );

        Rule rule = new Rule(this, "cdk-lambda-cron-rule",
                RuleProps.builder()
                        .description("Run every day at 6PM UTC")
                        .schedule(Schedule.expression("cron(0 18 ? * MON-FRI *)"))
                        .build()
        );

        rule.addTarget(new LambdaFunction(lambdaFunction));
    }
}
