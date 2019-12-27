using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ElasticbeanstalkEnvironment
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App();

            new ElasticbeanstalkEnvironmentStack(app, "ElasticbeanstalkEnvironmentStack");

            app.Synth();
        }
    }
}
