using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;
using ApiCorsCSharpLambdaCrudDynamodb;

namespace ApiCorsCSharpLambdaCrudDynamodb
{
  sealed class Program
  {
    public static void Main(string[] args)
    {
      var app = new App();
      new ApiCorsCSharpLambdaCrudDynamodbStack(app, "ApiCorsCSharpLambdaCrudDynamodb", new StackProps());
      app.Synth();
    }
  }
}
