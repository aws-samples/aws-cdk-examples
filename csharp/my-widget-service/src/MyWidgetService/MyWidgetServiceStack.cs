using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.S3;
using Constructs;
using System.Collections.Generic;

namespace MyWidgetService
{
    internal sealed class MyWidgetServiceStack : Stack
    {
        public MyWidgetServiceStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var bucket = new Bucket(this, "WidgetStore");

            var handler = new Function(this, "WidgetHandler", new FunctionProps {
                Runtime = Runtime.NODEJS_10_X,
                Code = Code.FromAsset("src/MyWidgetService/resources"),
                Handler = "widgets.main",
                Environment = new Dictionary<string, string>{
                    { "BUCKET", bucket.BucketName }
                }
            });

            bucket.GrantReadWrite(handler);

            var api = new RestApi(this, "widgets-api", new RestApiProps {
                RestApiName = "Widget Service",
                Description = "This service serves widgets"
            });

            var getWidgetsIntegration = new LambdaIntegration(handler, new LambdaIntegrationOptions{
                RequestTemplates = new Dictionary<string, string>{
                    { "application/json", "{ 'statusCode', '200'}" }
                },
            });

            api.Root.AddMethod("GET", getWidgetsIntegration);

            var widget = api.Root.AddResource("{id}");

            var postWidgetIntegration = new LambdaIntegration(handler);
            var getWidgetIntegration = new LambdaIntegration(handler);
            var deleteWidgetIntegration = new LambdaIntegration(handler);

            widget.AddMethod("POST", postWidgetIntegration);
            widget.AddMethod("GET", getWidgetIntegration);
            widget.AddMethod("DELETE", deleteWidgetIntegration);
        }
    }
}
