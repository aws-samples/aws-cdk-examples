using System;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using DynamoItemRepository;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace GetOne
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
        if (!apigProxyEvent.QueryStringParameters.TryGetValue("id", out string idToLookUp)) return NotFoundResponse;

        var result = await _dynamoItemRepository.GetOne(idToLookUp);
        if (result == null) return NotFoundResponse;

        return new APIGatewayProxyResponse {StatusCode = 200, Body = JsonSerializer.Serialize(result)};
      }
      catch (Exception e)
      {
        context.Logger.LogLine(e.Message);
        return new APIGatewayProxyResponse {StatusCode = 500};
      }
    }

    private APIGatewayProxyResponse NotFoundResponse => new APIGatewayProxyResponse() {StatusCode = 404};
  }
}
