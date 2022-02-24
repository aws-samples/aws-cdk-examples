using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Events;
using Amazon.CDK.AWS.Events.Targets;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace RandomWriter
{
    internal sealed class RandomWriterStack : Stack
    {
        public RandomWriterStack(Construct parent, string id, IStackProps props = null) : base(parent, id, props)
        {
            // The code that defines your stack goes here
            var randomWriter = new RandomWriter(this, "RandomWriter");
            new Rule(this, "Trigger", new RuleProps()
            {
                Description = "Triggers a RandomWrite every minute",
                Schedule = Schedule.Rate(Duration.Minutes(1)),
                Targets = new [] { randomWriter }
            });
        }
    }

    internal sealed class RandomWriter : Construct, IRuleTarget
    {
        private IFunction Function { get; }

        public RandomWriter(Construct scope, string id): base(scope, id)
        {
            var table = new Table(this, "Table", new TableProps
            {
                PartitionKey = new Attribute
                {
                    Name = "ID",
                    Type = AttributeType.STRING
                }
            });

            Function = new Function(this, "Lambda", new FunctionProps
            {
                Runtime = Runtime.NODEJS_10_X,
                Handler = "index.handler",
                Code = Code.FromAsset("src/RandomWriter/resources"),
                Environment = new Dictionary<string, string>
                {
                    { "TABLE_NAME", table.TableName }
                }
            });

            table.GrantReadWriteData(Function);
        }

        public IRuleTargetConfig Bind(IRule rule, string id = null)
        {
            return new LambdaFunction(Function).Bind(rule, id);
        }
    }
}
