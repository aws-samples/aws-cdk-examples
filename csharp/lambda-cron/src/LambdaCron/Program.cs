using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace LambdaCron
{
    sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            new LambdaCronStack(app, "LambdaCronStack", new StackProps{});

            app.Synth();
        }
    }
}
