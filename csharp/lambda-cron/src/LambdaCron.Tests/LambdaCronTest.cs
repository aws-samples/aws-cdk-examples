using Xunit;
using LambdaCron;
using Amazon.CDK;
using Amazon.CDK.Assertions;
using System.Collections.Generic;
using System.Dynamic;

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

        [Fact]
        public void correctLambdaProperties()
        {
            var dependencyCapture = new Capture();

            template.HasResource("AWS::Lambda::Function", new Dictionary<string,object> {
                {"Properties", new Dictionary<string, object> {
                  {"Code", new Dictionary<string, object> {
                      {"ZipFile", "def main(event, context):\n" + "    print(\"I'm running!\")\n"}
                  }},
                  {"Handler", "index.main"},
                  {"Runtime", "python3.6"},
                  {"Timeout", 300}
                }},
                {"DependsOn", new [] { dependencyCapture }}
            });

            Assert.Contains("SingletonServiceRole", dependencyCapture.AsString());
        }

        [Fact]
        public void correctIamPermissions()
        {
            var roleCapture = new Capture();

            template.HasResourceProperties("AWS::IAM::Role", new Dictionary<string,object> {
                {"AssumeRolePolicyDocument", Match.ObjectLike( new Dictionary<string,object>{
                    {"Statement", new [] { new Dictionary<string,object> {
                        {"Action", "sts:AssumeRole"},
                        {"Effect", "Allow"},
                        {"Principal", new Dictionary<string,object> {
                            {"Service", "lambda.amazonaws.com"}
                        }}
                    }}}
                })},
                {"ManagedPolicyArns", new [] { new Dictionary<string,object> {
                    {"Fn::Join", Match.ArrayWith(new object[] { new object[] {
                        "arn:", 
                        new Dictionary<string,object> {
                            {"Ref","AWS::Partition"}
                        },
                        roleCapture
                    }})}
                }}}
            });

            Assert.Contains("AWSLambdaBasicExecutionRole", roleCapture.AsString());
        }

        [Fact]
        public void notInVpc()
        {
            template.HasResource("AWS::Lambda::Function", new Dictionary<string,object> {
                {"Vpc", Match.Absent()}
            });
        }


        [Fact]
        public void eventHasCorrectRule()
        {
            template.HasResourceProperties("AWS::Events::Rule", new Dictionary<string,object> {
                {"ScheduleExpression", "cron(0 18 ? * MON-FRI *)"},
                {"State", "ENABLED"},
                {"Targets", Match.AnyValue()}
            });
        }
    }
}