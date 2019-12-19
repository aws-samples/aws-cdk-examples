using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CapitalizeString
{
    sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            new CapitalizeStringStack(app, "CapitalizeStringStack");
            app.Synth();
        }
    }
}
