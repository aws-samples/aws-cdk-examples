using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace CapitalizeString
{
    public class CapitalizeStringStack : Stack
    {
        internal CapitalizeStringStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            Function fn = new Function(this, "capitalizestring", new FunctionProps
            {
                Runtime = Runtime.DOTNET_CORE_3_1,
                Code = Code.FromAsset("./CapitalizeStringHandler/src/CapitalizeStringHandler/bin/Release/net6.0/publish"),
                Handler = "CapitalizeStringHandler::CapitalizeStringHandler.Function::FunctionHandler"
            });
        }
    }
}
