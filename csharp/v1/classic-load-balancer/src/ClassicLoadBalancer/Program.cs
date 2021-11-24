using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ClassicLoadBalancer
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App();

            new ClassicLoadBalancerStack(app, "ClassicLoadBalancerStack");

            app.Synth();
        }
    }
}
