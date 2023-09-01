using System;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using DynamoItemRepository;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace DeleteOne
{
  public class Function
  {
    private readonly IDynamoItemRepository _dynamoItemRepository;

    public Function()
    {
      _dynamoItemRepository = new DynamoDbItemRepository();
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest apigProxyEvent,
      ILambdaContext context)
    {
      try
      {
        if (!apigProxyEvent.QueryStringParameters.TryGetValue("id", out var idToLookUp)) return NotFoundResponse;

        var result = await _dynamoItemRepository.GetOne(idToLookUp);
        if (result == null) return NotFoundResponse;

        await _dynamoItemRepository.DeleteOne(idToLookUp);

        return new APIGatewayProxyResponse {StatusCode = 200};
      }
      catch (Exception e)
      {
        context.Logger.LogLine(e.Message);
        return new APIGatewayProxyResponse
        {
          StatusCode = 500,
          Body = e.Message
        };
      }
    }

    private APIGatewayProxyResponse NotFoundResponse => new() {StatusCode = 404};
  }
}
