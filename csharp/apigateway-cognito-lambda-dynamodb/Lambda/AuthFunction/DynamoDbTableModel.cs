using Amazon.DynamoDBv2.DataModel;

[DynamoDBTable("UserGroupApiGwAccessPolicy")]
public class DynamoDbTableModel
{
  [DynamoDBHashKey]
  public string UserPoolGroup { get; set; } = String.Empty;
  public string ApiGwAccessPolicy { get; set; } = String.Empty;
}