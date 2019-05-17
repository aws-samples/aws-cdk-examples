package software.amazon.awscdk.examples;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.events.EventRule;
import software.amazon.awscdk.services.events.EventRuleProps;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SingletonFunction;
import software.amazon.awscdk.services.lambda.SingletonFunctionProps;

import java.util.UUID;

/**
 * Lambda Cron CDK example for Java!
 */
class LambdaCronStack extends Stack {
    public LambdaCronStack(final App parent, final String name) {
        super(parent, name);

        SingletonFunction lambdaFunction = new SingletonFunction(this, "cdk-lambda-cron",
                SingletonFunctionProps.builder()
                        .withFunctionName("CDK Lambda Cron Example")
                        .withDescription("Lambda which prints \"I'm running\"")
                        .withCode(Code.inline(
                                "def main(event, context):\n" +
                                        "    print(\"I'm running!\")\n"))
                        .withHandler("index.main")
                        .withTimeout(300)
                        .withRuntime(Runtime.PYTHON27)
                        .withUuid(UUID.randomUUID().toString())
                        .build()
        );

        EventRule rule = new EventRule(this, "cdk-lambda-cron-rule",
                EventRuleProps.builder()
                        .withDescription("Run every day at 6PM UTC")
                        .withScheduleExpression("cron(0 18 ? * MON-FRI *)")
                        .build()
        );

        rule.addTarget(lambdaFunction);
    }
}
