using System;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using DynamoItemRepository;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace UpdateOne
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
        var itemToUpdate = JsonSerializer.Deserialize<ItemModel>(apigProxyEvent.Body);
        if (itemToUpdate == null || itemToUpdate.ItemId.Length == 0) return NotFoundResponse;

        var result = await _dynamoItemRepository.GetOne(itemToUpdate.ItemId);
        if (result == null) return NotFoundResponse;

        await _dynamoItemRepository.Update(itemToUpdate);

        return new APIGatewayProxyResponse {StatusCode = 200,};
      }
      catch (Exception e)
      {
        context.Logger.LogLine(e.Message);
        return new APIGatewayProxyResponse {StatusCode = 500};
      }
    }

    private APIGatewayProxyResponse NotFoundResponse => new() {StatusCode = 404};
  }
}
