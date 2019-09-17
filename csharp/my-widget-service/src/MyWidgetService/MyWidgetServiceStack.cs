using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.S3;
using System.Collections.Generic;

namespace MyWidgetService
{
    public class MyWidgetServiceStack : Stack
    {
        public MyWidgetServiceStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var bucket = new Bucket(this, "WidgetStore", null);

            var handler = new Function(this, "WidgetHandler", new FunctionProps {
                Runtime = Runtime.NODEJS_8_10,
                Code = AssetCode.Asset("src/MyWidgetService/resources"),
                Handler = "widgets.main",
                Environment = new Dictionary<string, object>{
                    { "BUCKET", bucket.BucketName }
                }
            });

            bucket.GrantReadWrite(handler, null);

            var api = new RestApi(this, "widgets-api", new RestApiProps {
                RestApiName = "Widget Service",
                Description = "This service serves widgets"
            });

            var getWidgetsIntegration = new LambdaIntegration(handler, new LambdaIntegrationOptions{
                RequestTemplates = new Dictionary<string, string>{
                    { "application/json", "{ 'statusCode', '200'}" }
                },
            });

            api.Root.AddMethod("GET", getWidgetsIntegration, null);

            var widget = api.Root.AddResource("{id}", null);

            var postWidgetIntegration = new LambdaIntegration(handler, null);
            var getWidgetIntegration = new LambdaIntegration(handler, null);
            var deleteWidgetIntegration = new LambdaIntegration(handler, null);

            widget.AddMethod("POST", postWidgetIntegration, null);
            widget.AddMethod("GET", getWidgetIntegration, null);
            widget.AddMethod("DELETE", deleteWidgetIntegration, null);
        }
    }
}
