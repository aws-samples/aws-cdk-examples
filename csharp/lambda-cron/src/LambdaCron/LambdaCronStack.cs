using Amazon.CDK;
using Amazon.CDK.AWS.Events;
using Amazon.CDK.AWS.Events.Targets;
using Amazon.CDK.AWS.Lambda;
using System.IO;
using System.Text;

namespace LambdaCron
{
  public class LambdaCronStack : Stack
  {
    internal LambdaCronStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
    {
      string currentDirectory = Directory.GetCurrentDirectory();
      string filePath = Path.Combine(currentDirectory, "src/LambdaCron/lambda-handler.py");
      string inlineCodeFromFile = File.ReadAllText(filePath, Encoding.UTF8);

      var lambdaFunction = new Function(this, "Singleton", new FunctionProps()
      {
        Code = new InlineCode(inlineCodeFromFile),
        Handler = "index.main",
        Timeout = Duration.Seconds(300),
        Runtime = Runtime.PYTHON_3_6
      });

      // Run 6:00 PM UTC every Monday through Friday
      // See https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html
      var rule = new Rule(this, "Rule", new RuleProps()
      {
        Schedule = Schedule.Expression("cron(0 18 ? * MON-FRI *)")
      });

      rule.AddTarget(new LambdaFunction(lambdaFunction));
    }
  }
}
