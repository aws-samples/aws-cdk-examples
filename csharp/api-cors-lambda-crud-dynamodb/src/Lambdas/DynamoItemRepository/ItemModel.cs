using Amazon.DynamoDBv2.DataModel;

namespace DynamoItemRepository
{
  [DynamoDBTable("Items")]
  public class ItemModel
  {
    [DynamoDBHashKey]
    public string ItemId { get; set; }

    [DynamoDBProperty]
    public string AnExampleField { get; set; }
  }
}
