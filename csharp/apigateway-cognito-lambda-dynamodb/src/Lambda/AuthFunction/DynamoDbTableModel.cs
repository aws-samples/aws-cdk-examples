using Amazon.DynamoDBv2.DataModel;
using System;

[DynamoDBTable("UserGroupApiGwAccessPolicy")]
public class DynamoDbTableModel
{
  [DynamoDBHashKey]
  public string UserPoolGroup { get; set; } = String.Empty;
  public string ApiGwAccessPolicy { get; set; } = String.Empty;
}