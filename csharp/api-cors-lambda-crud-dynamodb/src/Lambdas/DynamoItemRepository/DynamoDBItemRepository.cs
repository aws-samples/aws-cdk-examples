using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;

namespace DynamoItemRepository
{
  public class DynamoDbItemRepository : IDynamoItemRepository
  {
    private readonly DynamoDBContext _dynamoDbContext;

    public DynamoDbItemRepository()
    {
      _dynamoDbContext = new DynamoDBContext(new AmazonDynamoDBClient());
    }

    public async Task<ItemModel> CreateOne(ItemModel item)
    {
      item.ItemId = Guid.NewGuid().ToString();
      await _dynamoDbContext.SaveAsync(item);
      return await GetOne(item.ItemId);
    }

    public async Task DeleteOne(string id)
    {
      await _dynamoDbContext.DeleteAsync<ItemModel>(id);
    }

    public async Task<IEnumerable<ItemModel>> GetAll()
    {
      return await _dynamoDbContext.ScanAsync<ItemModel>(new
        List<ScanCondition>()).GetRemainingAsync();
    }

    public async Task<ItemModel> GetOne(string id)
    {
      return await _dynamoDbContext.LoadAsync<ItemModel>(id);
    }

    public async Task Update(ItemModel item)
    {
      await _dynamoDbContext.SaveAsync(item);
    }
  }
}
