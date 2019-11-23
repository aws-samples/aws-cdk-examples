using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace StaticSite
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App(null);

            // A CDK app can contain multiple stacks. You can view a list of all the stacks in your
            // app by typing `cdk list`.

            // Stack must be in us-east-1, because the ACM certificate for a
            // global CloudFront distribution must be requested in us-east-1.
            new StaticSiteStack(app, "StaticSiteStack", new StackProps{Env = new Amazon.CDK.Environment{Account = "111111111", Region="us-east-1"}});

            app.Synth();
        }
    }
}
