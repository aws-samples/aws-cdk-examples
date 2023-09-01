using System;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using DynamoItemRepository;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace Create
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
        var itemToCreate = JsonSerializer.Deserialize<ItemModel>(apigProxyEvent.Body);
        var createdItem = await _dynamoItemRepository.CreateOne(itemToCreate);
        return new APIGatewayProxyResponse {Body = JsonSerializer.Serialize(createdItem), StatusCode = 200};
      }
      catch (Exception e)
      {
        context.Logger.LogLine(e.Message);
        return new APIGatewayProxyResponse {StatusCode = 500};
      }
    }
  }
}
