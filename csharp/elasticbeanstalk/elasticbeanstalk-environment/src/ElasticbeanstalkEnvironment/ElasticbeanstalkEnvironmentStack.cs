using Amazon.CDK;
using Amazon.CDK.AWS.ElasticBeanstalk;
using Constructs;

namespace ElasticbeanstalkEnvironment
{
    public class ElasticbeanstalkEnvironmentStack : Stack
    {
        public ElasticbeanstalkEnvironmentStack(Construct scope, string id, IStackProps props = null) : base(scope, id)
        {
            const string appName = "MyApp";

            var platform = this.Node.TryGetContext("platform").ToString();

            var app = new CfnApplication(this, "Application", new CfnApplicationProps
            {
                ApplicationName = appName
            });

            new CfnEnvironment(this, "Environment", new CfnEnvironmentProps
            {
                EnvironmentName = "MySampleEnvironment",
                ApplicationName = app.ApplicationName,
                PlatformArn = platform
            });
        }
    }
}
