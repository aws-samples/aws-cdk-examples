using Amazon.CDK;

namespace ApiCorsLambdaCrudDynamodb
{
    sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            new ApiCorsLambdaCrudDynamodbStack(app, "ApiCorsLambdaCrudDynamodbStack", new StackProps
            {
            });
            app.Synth();
        }
    }
}
