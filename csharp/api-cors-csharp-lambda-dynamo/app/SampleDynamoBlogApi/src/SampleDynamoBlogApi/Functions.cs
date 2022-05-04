using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;

using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Newtonsoft.Json;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace SampleDynamoBlogApi
{
  public class Functions
  {
    // This const is the name of the environment variable that the serverless.template will use to set
    // the name of the DynamoDB table used to store blog posts.
    private const string TABLENAME_ENVIRONMENT_VARIABLE_LOOKUP = "TABLE_NAME";
    private const string PRIMARYKEY_ENVIRONMENT_VARIABLE_LOOKUP = "PRIMARY_KEY";
    private readonly string _tableName;
    private readonly string _primaryKey;
    IDynamoDBContext DDBContext { get; set; }

    /// <summary>
    /// Default constructor that Lambda will invoke.
    /// </summary>
    public Functions()
    {
      // Check to see if a table name was passed in through environment variables and if so
      // add the table mapping.
      _tableName = System.Environment.GetEnvironmentVariable(TABLENAME_ENVIRONMENT_VARIABLE_LOOKUP);
      _primaryKey = System.Environment.GetEnvironmentVariable(PRIMARYKEY_ENVIRONMENT_VARIABLE_LOOKUP);
      Console.WriteLine($"_tableName: {_tableName}");
      Console.WriteLine($"_primaryKey: {_primaryKey}");
      if (!string.IsNullOrEmpty(_tableName))
      {
        AWSConfigsDynamoDB.Context.TypeMappings[typeof(Blog)] = new Amazon.Util.TypeMapping(typeof(Blog), _tableName);
      }

      var config = new DynamoDBContextConfig { Conversion = DynamoDBEntryConversion.V2 };
      this.DDBContext = new DynamoDBContext(new AmazonDynamoDBClient(), config);
    }

    /// <summary>
    /// Constructor used for testing passing in a preconfigured DynamoDB client.
    /// </summary>
    /// <param name="ddbClient"></param>
    /// <param name="tableName"></param>
    public Functions(IAmazonDynamoDB ddbClient, string tableName)
    {
      if (!string.IsNullOrEmpty(tableName))
      {
        Console.WriteLine($"tableName: {tableName}");
        AWSConfigsDynamoDB.Context.TypeMappings[typeof(Blog)] = new Amazon.Util.TypeMapping(typeof(Blog), tableName);
      }

      var config = new DynamoDBContextConfig { Conversion = DynamoDBEntryConversion.V2 };
      this.DDBContext = new DynamoDBContext(ddbClient, config);
    }

    /// <summary>
    /// A Lambda function that returns back a page worth of blog posts.
    /// </summary>
    /// <param name="request"></param>
    /// <returns>The list of blogs</returns>
    public async Task<APIGatewayProxyResponse> GetBlogsAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
      try
      {
        context.Logger.LogLine($"Getting blogs from {this._tableName}");
        var blogs = await this.DDBContext.ScanAsync<Blog>(new List<ScanCondition>()).GetRemainingAsync();
        context.Logger.LogLine($"Found {blogs.Count} blogs");

        var response = new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.OK,
          Body = JsonConvert.SerializeObject(blogs),
          Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
        };

        return response;
      }
      catch (Exception ex)
      {
        context.Logger.LogLine($"ERROR getAll {ex.Message + " " + ex.StackTrace}");
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.InternalServerError,
          Body = ex.Message + " " + ex.StackTrace,
          Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
        };
      }
    }

    /// <summary>
    /// A Lambda function that returns the blog identified by blogId
    /// </summary>
    /// <param name="request"></param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> GetBlogAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
      string blogId = null;
      if (request.PathParameters != null && request.PathParameters.ContainsKey(_primaryKey))
        blogId = request.PathParameters[_primaryKey];
      else if (request.QueryStringParameters != null && request.QueryStringParameters.ContainsKey(_primaryKey))
        blogId = request.QueryStringParameters[_primaryKey];

      if (string.IsNullOrEmpty(blogId))
      {
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.BadRequest,
          Body = $"Missing required parameter {_primaryKey}"
        };
      }

      context.Logger.LogLine($"Getting blog {blogId}");
      var blog = await DDBContext.LoadAsync<Blog>(blogId);
      context.Logger.LogLine($"Found blog: {blog != null}");

      if (blog == null)
      {
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.NotFound
        };
      }

      var response = new APIGatewayProxyResponse
      {
        StatusCode = (int)HttpStatusCode.OK,
        Body = JsonConvert.SerializeObject(blog),
        Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
      };
      return response;
    }

    /// <summary>
    /// A Lambda function that updates a blog post.
    /// </summary>
    /// <param name="request"></param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> UpdateBlogAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
      string blogId = null;
      if (request.PathParameters != null && request.PathParameters.ContainsKey(_primaryKey))
        blogId = request.PathParameters[_primaryKey];
      else if (request.QueryStringParameters != null && request.QueryStringParameters.ContainsKey(_primaryKey))
        blogId = request.QueryStringParameters[_primaryKey];

      if (string.IsNullOrEmpty(blogId))
      {
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.BadRequest,
          Body = $"Missing required parameter {_primaryKey}"
        };
      }

      var blog = JsonConvert.DeserializeObject<Blog>(request?.Body);
      if (blog.Id != blogId)
      {
        context.Logger.LogLine($"Missing required parameters do not match {blogId} and {blog.Id}");
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.Conflict,
          Body = $"Missing required parameters do not match {blogId}"
        };
      }

      context.Logger.LogLine($"Getting blog {blog.Id}");
      var existingBlog = await DDBContext.LoadAsync<Blog>(blog.Id);
      context.Logger.LogLine($"Found blog: {existingBlog != null}");

      if (existingBlog == null)
      {
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.NotFound
        };
      }

      blog.CreatedTimestamp = existingBlog.CreatedTimestamp;

      context.Logger.LogLine($"Updating blog with id {blog.Id}");
      await DDBContext.SaveAsync<Blog>(blog);

      var response = new APIGatewayProxyResponse
      {
        StatusCode = (int)HttpStatusCode.OK,
        Body = blog.Id.ToString(),
        Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
      };
      return response;
    }

    /// <summary>
    /// A Lambda function that adds a blog post.
    /// </summary>
    /// <param name="request"></param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> AddBlogAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
      context.Logger.LogLine($"Saving blog body: {request?.Body}");
      var blog = JsonConvert.DeserializeObject<Blog>(request?.Body);


      blog.Id = Guid.NewGuid().ToString();
      blog.CreatedTimestamp = DateTime.Now;

      context.Logger.LogLine($"Saving blog with id {blog.Id}");
      await DDBContext.SaveAsync<Blog>(blog);

      var response = new APIGatewayProxyResponse
      {
        StatusCode = (int)HttpStatusCode.OK,
        Body = blog.Id.ToString(),
        Headers = new Dictionary<string, string> { { "Content-Type", "text/plain" } }
      };
      return response;
    }

    /// <summary>
    /// A Lambda function that removes a blog post from the DynamoDB table.
    /// </summary>
    /// <param name="request"></param>
    public async Task<APIGatewayProxyResponse> RemoveBlogAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
      string blogId = null;
      if (request.PathParameters != null && request.PathParameters.ContainsKey(_primaryKey))
        blogId = request.PathParameters[_primaryKey];
      else if (request.QueryStringParameters != null && request.QueryStringParameters.ContainsKey(_primaryKey))
        blogId = request.QueryStringParameters[_primaryKey];

      if (string.IsNullOrEmpty(blogId))
      {
        return new APIGatewayProxyResponse
        {
          StatusCode = (int)HttpStatusCode.BadRequest,
          Body = $"Missing required parameter {_primaryKey}"
        };
      }

      context.Logger.LogLine($"Deleting blog with id {blogId}");
      await this.DDBContext.DeleteAsync<Blog>(blogId);

      return new APIGatewayProxyResponse
      {
        StatusCode = (int)HttpStatusCode.OK
      };
    }
  }
}
