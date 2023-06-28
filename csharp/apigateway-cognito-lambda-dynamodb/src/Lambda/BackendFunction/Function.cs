using System.Net;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using System.Collections.Generic;
using System;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Lambda.BackendFunction
{

  public class Function
  {

    /// <summary>
    /// Lambda function handler to return response for GET and POST endpoint
    /// </summary>
    /// <param name="request"></param>
    /// <param name="context"></param>
    /// <returns>APIGatewayProxyResponse</returns>
    public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
      switch (request.HttpMethod.ToUpper())
      {
        case "GET":
          return new APIGatewayProxyResponse
          {
            StatusCode = (int)HttpStatusCode.OK,
            Body = "Hello",
            Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
          };
        case "POST":
          return new APIGatewayProxyResponse
          {
            StatusCode = (int)HttpStatusCode.Created,
            Body = "Created",
            Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
          };
        default:
          return new APIGatewayProxyResponse
          {
            StatusCode = (int)HttpStatusCode.BadRequest,
            Body = "Invalid HttpMethod",
            Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
          };
      }
    }
  }
}