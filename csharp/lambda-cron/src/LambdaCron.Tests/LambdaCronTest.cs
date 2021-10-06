using Xunit;
using LambdaCron;
using Amazon.CDK;
using Amazon.CDK.Assertions;
using System;

namespace LambdaCron.UnitTests
{
    public class LambdaCron_Tests
    {
        App app;
        Stack stack;
        Template template;

        public LambdaCron_Tests()
        {
            app = new App();
            stack = new LambdaCronStack(app, "testStack");
            template = Template.FromStack(stack);
        }

        [Fact]
        public void specifiedResourcesCreated()
        {
            template.ResourceCountIs("AWS::Lambda::Function", 1);
            template.ResourceCountIs("AWS::Events::Rule", 1);
        }
    }
}