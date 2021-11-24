using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace StepfunctionsJobPoller
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App();

            new StepfunctionsJobPollerStack(app, "StepfunctionsJobPollerStack");

            app.Synth();
        }
    }
}
