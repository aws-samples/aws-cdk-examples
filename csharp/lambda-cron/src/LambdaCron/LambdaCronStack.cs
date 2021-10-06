using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Events.Targets;
using Amazon.CDK.AWS.Events;

namespace LambdaCron
{
    public class LambdaCronStack : Stack
    {
        public LambdaCronStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var lambdaFn = new Function(this, "Singleton", new FunctionProps {
                Runtime = Runtime.PYTHON_3_6,
                Code = Code.FromInline("def main(event, context):\n" + "    print(\"I'm running!\")\n"),
                Handler = "index.main",
                Timeout = Duration.Seconds(300),
            });

            // Run 6:00 PM UTC every Monday through Friday
            // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
            var rule = new Rule(this, "Rule", new RuleProps {
                Schedule = Schedule.Expression("cron(0 18 ? * MON-FRI *)"),
            });

            rule.AddTarget(new LambdaFunction(lambdaFn));
        }
    }
}
