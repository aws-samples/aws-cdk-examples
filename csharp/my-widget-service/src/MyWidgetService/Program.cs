using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MyWidgetService
{
    public sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            new MyWidgetServiceStack(app, "MyWidgetServiceStack", new StackProps());
            app.Synth();
        }
    }
}
