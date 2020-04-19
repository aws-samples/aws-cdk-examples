using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ElasticbeanstalkBgPipeline
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App();

            new ElasticbeanstalkBgPipelineStack(app, "ElasticbeanstalkBgPipelineStack");

            app.Synth();
        }
    }
}
