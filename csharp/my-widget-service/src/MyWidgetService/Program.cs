using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MyWidgetService
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App(null);
            new MyWidgetServiceStack(app, "MyWidgetServiceStack", new StackProps());
            app.Synth();
        }
    }
}
