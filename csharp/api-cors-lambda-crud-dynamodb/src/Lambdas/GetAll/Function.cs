using System;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using DynamoItemRepository;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace GetAll
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
        var results = await _dynamoItemRepository.GetAll();
        return new APIGatewayProxyResponse {StatusCode = 200, Body = JsonSerializer.Serialize(results)};
      }
      catch (Exception e)
      {
        context.Logger.LogLine(e.Message);
        return new APIGatewayProxyResponse {StatusCode = 500};
      }
    }
  }
}
