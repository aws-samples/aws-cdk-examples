using System.Collections.Generic;
using System.Threading.Tasks;

namespace DynamoItemRepository
{
  public interface IDynamoItemRepository
  {
    Task<ItemModel> CreateOne(ItemModel item);
    Task DeleteOne(string id);
    Task<IEnumerable<ItemModel>> GetAll();
    Task<ItemModel> GetOne(string id);
    Task Update(ItemModel item);
  }
}
