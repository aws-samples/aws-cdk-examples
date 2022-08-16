using Amazon.Lambda.Core;
using Amazon.S3;
using System;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Validate
{
    public class DataImportInput
    {
        public string Bucket { get; set; }
        public string Key { get; set; }
        public string DateTime { get; set; }
        public string Region { get; set; }
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
    }
    public class Function
    {
        AmazonS3Client S3Client { get; set; }
    

        public Function()
        {
            S3Client = new AmazonS3Client();
        }

        public Function(AmazonS3Client s3Client)
        {
            this.S3Client = s3Client;
        }
        
        public DataImportOutput FunctionHandler(DataImportInput StateInput, ILambdaContext context)
        {
            var stateResponse = new DataImportOutput(); 

            //  Validate input data
            if(StateInput.Bucket == "" || StateInput.Key == "" || StateInput.DateTime == "" || StateInput.Region == "")
            { 
                stateResponse.IsValid = false;
                stateResponse.ErrorMessage = "Missing Required S3 event data";
                stateResponse.ErrorState = true;
                context.Logger.LogLine("Missing Required S3 Event Data");
                return stateResponse;
            }

            //  Set output data
            stateResponse.Bucket = StateInput.Bucket;
            stateResponse.Key = StateInput.Key;
            stateResponse.DateTime = StateInput.DateTime;
            stateResponse.Region = StateInput.Region;
            stateResponse.IsValid = true;
            stateResponse.ErrorState = false;
            stateResponse.ErrorMessage = string.Empty;

            try
            {
                // Add custom validation logic here to use S3Client to retrieve Object data
                //      or customer ID based on S3 key
                //

                //  Example:  Get customer ID based on key (filename) or set error and make invalid
                if (stateResponse.Key.Split(".")[0].ToLower().Contains("lambda")) {stateResponse.CustomerID = 0;}
                else if(stateResponse.Key.Split(".")[0].ToLower().Contains("dynamodb")) {stateResponse.CustomerID = 1;}
                else if(stateResponse.Key.Split(".")[0].ToLower().Contains("sqs")) {stateResponse.CustomerID = 2;}
                else 
                {
                    stateResponse.IsValid = false;
                    stateResponse.ErrorMessage = "No Matching CustomerID";
                    stateResponse.ErrorState = true;
                }
                
                
            }
            catch(Exception e)
            {
                stateResponse.IsValid = false;
                context.Logger.LogLine(e.Message);
                context.Logger.LogLine(e.StackTrace);
                throw;
            }
           
            return stateResponse;
        }
    }
}
