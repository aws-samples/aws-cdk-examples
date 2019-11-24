using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFormation;
using Amazon.CDK.AWS.Lambda;

namespace CustomResource
{
    public class CustomResourceStack : Stack
    {
        public CustomResourceStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var resource = new Amazon.CDK.AWS.CloudFormation.CustomResource(this, "Resource", new CustomResourceProps{
                Provider = CustomResourceProvider.FromLambda(new SingletonFunction(this, "Singleton", new SingletonFunctionProps{
                    Uuid = "THIS_IS_A_TOTALLY_RANDOM_STRING",
                    Code = new AssetCode("src/lambda_code"),
                    Handler = "custom-resource-handler.main",
                    Timeout = Duration.Seconds(300),
                    Runtime = Runtime.PYTHON_3_7
                })),
                Properties = new Dictionary<string, object> {
                    {"message", "CustomResource says hello"}
                }
            });

            new CfnOutput(this, "Response Message", new CfnOutputProps{
                Description = "The message that came back from the Custom Resource",
                Value = resource.GetAtt("Response").ToString()
            });
        }
    }
}
