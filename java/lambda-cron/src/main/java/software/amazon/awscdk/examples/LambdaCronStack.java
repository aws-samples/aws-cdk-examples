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
                        .withDescription("Lambda which prints \"I'm running\"")
                        .withCode(Code.inline(
                                "def main(event, context):\n" +
                                        "    print(\"I'm running!\")\n"))
                        .withHandler("index.main")
                        .withTimeout(Duration.seconds(300))
                        .withRuntime(Runtime.PYTHON_2_7)
                        .withUuid(UUID.randomUUID().toString())
                        .build()
        );

        Rule rule = new Rule(this, "cdk-lambda-cron-rule",
                RuleProps.builder()
                        .withDescription("Run every day at 6PM UTC")
                        .withSchedule(Schedule.expression("cron(0 18 ? * MON-FRI *)"))
                        .build()
        );

        rule.addTarget(new LambdaFunction(lambdaFunction));
    }
}