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
            var app = new App();

            // Stack must be in us-east-1, because the ACM certificate for a
            // global CloudFront distribution must be requested in us-east-1.
            new StaticSiteStack(app, "StaticSiteStack", new StackProps
            {
                Env = new Amazon.CDK.Environment
                {
                    Account = "111111111",
                    Region="us-east-1"
                }
            });

            app.Synth();
        }
    }
}
