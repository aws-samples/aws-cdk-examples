using Amazon.Lambda.Core;
using Amazon.S3;
using System;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace ProcessData
{

    public class DynamoDBColumnStr
    {
        public string S { get; set; }
    }
    public class DynamoDBColumnInt
    {
        public string N { get; set; }
    }

    public class DataImportDBColumns
    {
        public DynamoDBColumnStr DateTime { get; set; }
        public DynamoDBColumnInt Customer  { get; set; }
        public DynamoDBColumnStr Bucket { get; set; }
        public DynamoDBColumnStr Key { get; set; }
        public DynamoDBColumnStr Region { get; set; }
    }
    public class DynamoDBItem
    {
        public string TableName { get; set; }
        public DataImportDBColumns Item { get; set; }     
    }

    public class SQSpayload
    {
        public string DateTime { get; set; }
        public int Customer { get; set; }
        public string Bucket { get; set; }
        public string Key { get; set; }
        public string Region { get; set; }
    }

    public class DeleteS3ObjectPayload
    {
        public string Bucket { get; set; }
        public string Key { get; set; }
    }

    public class DataImportOutput
    {
        public bool IsValid { get; set; }
        public int CustomerID { get; set; }
        public bool ErrorState { get; set; }
        public String ErrorMessage { get; set; }
        public int UseStateAction { get; set; }
        public string Bucket { get; set; }
        public string Key { get; set; }
        public string Region { get; set; }
        public string DateTime { get; set; }
        public object PayLoad { get; set; }
    }
    
    public class Function
    {
        IAmazonS3 S3Client { get; set; }

        public Function()
        {
            S3Client = new AmazonS3Client();
        }

        public Function(IAmazonS3 s3Client)
        {
            this.S3Client = s3Client;
        }
        
        public object FunctionHandler(DataImportOutput stateInput, ILambdaContext context)
        {
            var returnString = string.Empty;
            try
            {
                // Add custom processing logic here
                //

                // Setting UseStateAction to CustomerID for testing purposes
                stateInput.UseStateAction = stateInput.CustomerID;
                //  UseStateAction = 
                //      0: Data is processed in Lambda and no action taken in State Machine
                //      1: Data is send to DynamoDB PutItem action from State Machine
                //      2: Data is sent to SQS Queue from State Machine
                switch (stateInput.UseStateAction)
                {
                    case 1:
                        //DynamoDB - create JSon to write to table
                        var DynamoDBObject = new DynamoDBItem
                        {
                            TableName = "SFTP-Data-Import",
                            Item = new DataImportDBColumns
                                {
                                    DateTime = new DynamoDBColumnStr {S = stateInput.DateTime},
                                    Customer = new DynamoDBColumnInt {N = stateInput.CustomerID.ToString()},
                                    Bucket = new DynamoDBColumnStr {S = stateInput.Bucket},
                                    Key = new DynamoDBColumnStr {S = stateInput.Key},
                                    Region = new DynamoDBColumnStr {S = stateInput.Region}
                                }
                        };
                        stateInput.PayLoad = DynamoDBObject;
                    break;
                    case 2:
                        // SQS - create JSON to send to SQS queue
                        var SQSPayloadObject = new SQSpayload
                        {
                            DateTime = stateInput.DateTime,
                            Customer = stateInput.CustomerID,
                            Bucket = stateInput.Bucket,
                            Key = stateInput.Key,
                            Region = stateInput.Region
                        };
                        stateInput.PayLoad = SQSPayloadObject;
                    break;
                    default:
                        // Data processing handled in this lambda - send data for S3 Object delete
                        stateInput.PayLoad = new DeleteS3ObjectPayload 
                                {
                                    Bucket = stateInput.Bucket,
                                    Key = stateInput.Key
                                };
                        
                    break;
                }
                return stateInput;
                
            }
            catch(Exception e)
            {
                context.Logger.LogLine(e.Message);
                context.Logger.LogLine(e.StackTrace);
                throw;
            }
        }
    }
}
