using Amazon.CDK;
using Amazon.CDK.AWS.ElasticBeanstalk;

namespace ElasticbeanstalkEnvironment
{
    public class ElasticbeanstalkEnvironmentStack : Stack
    {
        public ElasticbeanstalkEnvironmentStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            const string appName = "MyApp";

            var platform = this.Node.TryGetContext("platform").ToString();

            var app = new CfnApplication(this, "Application", new CfnApplicationProps{
                ApplicationName = appName
            });

            new CfnEnvironment(this, "Environment", new CfnEnvironmentProps{
                EnvironmentName = "MySampleEnvironment",
                ApplicationName = app.ApplicationName,
                PlatformArn = platform
            });
        }
    }
}
