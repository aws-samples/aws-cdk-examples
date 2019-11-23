using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ApiCorsLambdaCrudDynamodb
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App(null);

            // A CDK app can contain multiple stacks. You can view a list of all the stacks in your
            // app by typing `cdk list`.

            new ApiCorsLambdaCrudDynamodbStack(app, "ApiCorsLambdaCrudDynamodbStack", new StackProps());

            app.Synth();
        }
    }
}
