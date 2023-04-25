using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using System.Net;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Amazon.DynamoDBv2;
using Newtonsoft.Json;
using Amazon.DynamoDBv2.DataModel;
using System.Threading.Tasks;
using System;
using System.Net.Http;
using System.Linq;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Lambda.AuthFunction
{

  public class Function
  {
    private string _jwks { get; set; }
    private string _clientId { get; set; }
    private string _userPool { get; set; }
    private readonly AmazonDynamoDBClient _dynamoDbClient;
    private readonly DynamoDBContext _context;

    /// <summary>
    /// Default constructor to read environment variables, Get the JWKs, and initialize DynamoDB context 
    /// </summary>
    /// <param name=""></param>
    /// <param name=""></param>
    /// <returns></returns>
    public Function()
    {
      LambdaLogger.Log("Initiating the default values");
      string? envRegion = Environment.GetEnvironmentVariable("REGION");
      string? envCognitoUserPoolId = Environment.GetEnvironmentVariable("COGNITO_USER_POOL_ID");
      string? envClientId = Environment.GetEnvironmentVariable("CLIENT_ID");
      if (String.IsNullOrEmpty(envRegion) || String.IsNullOrEmpty(envCognitoUserPoolId) || String.IsNullOrEmpty(envClientId))
        throw new ArgumentNullException("REGION or COGNITO_USER_POOL_ID or CLIENT_ID");

      _clientId = envClientId;
      _userPool = String.Format("https://cognito-idp.{0}.amazonaws.com/{1}", envRegion, envCognitoUserPoolId);
      string keyUrl = _userPool + "/.well-known/jwks.json";
      _jwks = GetJWKs(keyUrl).Result;

      _dynamoDbClient = new AmazonDynamoDBClient();
      _context = new DynamoDBContext(_dynamoDbClient);
    }

    /// <summary>
    /// Method to make GET JWKs by calling Cognito User pool Key URL  
    /// </summary>
    /// <param name="keyUrl"></param>
    /// <returns>Task</returns>
    private async Task<string> GetJWKs(string keyUrl)
    {
      HttpClient client = new HttpClient();
      return await client.GetStringAsync(keyUrl).ConfigureAwait(continueOnCapturedContext: false);
    }

    /// <summary>
    /// Lambda function handler to validate JWT token
    /// </summary>
    /// <param name="request"></param>
    /// <param name="context"></param>
    /// <returns>APIGatewayCustomAuthorizerResponse</returns>
    public APIGatewayCustomAuthorizerResponse FunctionHandler(APIGatewayCustomAuthorizerRequest request, ILambdaContext context)
    {
      LambdaLogger.Log("Received Auth request");
      /* Validating JWT token in three steps as documented at - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
        Step 1: Confirm the structure of the JWT
        Step 2: Validate the JWT signature
        Step 3: Verify the claims    
      */

      string token = GetTokenFromRequest(request.AuthorizationToken);

      //Step 1: Confirm the structure of the JWT
      if (!IsValidJwtStructure(token))
        throw new Exception("Unauthorized");

      //Step 2: Validate the JWT signature
      JwtSecurityToken? jwtSecurityToken = ValidateJwtSignature(token);
      if (jwtSecurityToken == null)
        throw new Exception("Unauthorized");

      //Step 3: Verify the claims
      string userGroup = VerifyClaims(jwtSecurityToken);
      if (String.IsNullOrEmpty(userGroup))
        throw new Exception("Unauthorized");

      // Get policy document based on user group
      string policyDocument = GetApiGwAccessPolicy(userGroup);

      if (String.IsNullOrEmpty(policyDocument))
      {
        //Return deny policy
        return new APIGatewayCustomAuthorizerResponse
        {
          PrincipalID = "yyyyyyyy",
          PolicyDocument = JsonConvert.DeserializeObject<APIGatewayCustomAuthorizerPolicy>(GetDenyPolicy()),
          Context = { },
          UsageIdentifierKey = ""
        };
      }

      return new APIGatewayCustomAuthorizerResponse
      {
        //Return access policy
        PrincipalID = "yyyyyyyy",
        PolicyDocument = JsonConvert.DeserializeObject<APIGatewayCustomAuthorizerPolicy>(policyDocument),
        Context = { },
        UsageIdentifierKey = ""
      };
    }

    /// <summary>
    /// Get token from request
    /// </summary>
    /// <param name="token"></param>
    /// <returns>string</returns>
    private string GetTokenFromRequest(string authorizationHeader)
    {
      string authToken = String.Empty;
      if (!String.IsNullOrEmpty(authorizationHeader))
      {
        var authHeaders = authorizationHeader.Split(" ");
        LambdaLogger.Log("authHearers.Count(): " + authHeaders.Count());
        if (authHeaders.Count() == 2 && authHeaders[0] == "Bearer")
        {
          return authHeaders[1];
        }
      }

      return authToken;
    }

    /// <summary>
    /// Validate JWT structure
    /// </summary>
    /// <param name="token"></param>
    /// <returns>bool</returns>
    private bool IsValidJwtStructure(string token)
    {
      if (String.IsNullOrEmpty(token))
        return false;

      if (token.Split(".").Count() != 3)
        return false;

      return true;
    }

    /// <summary>
    /// Verify JWT claims and return user group
    /// </summary>
    /// <param name="jwtSecurityToken"></param>
    /// <returns>string</returns>
    private string VerifyClaims(JwtSecurityToken? jwtSecurityToken)
    {
      if (jwtSecurityToken == null)
        return String.Empty;
      //Note: Token expiration already verified in ValidateJwtSignature method.  
      try
      {
        var clientId = jwtSecurityToken.Claims.First(x => x.Type == "client_id").Value;
        if (clientId != _clientId)
          return String.Empty;

        var iss = jwtSecurityToken.Claims.First(x => x.Type == "iss").Value;
        if (iss != _userPool)
          return String.Empty;

        var tokenUse = jwtSecurityToken.Claims.First(x => x.Type == "token_use").Value;
        if (tokenUse != "access")
          return String.Empty;

        return jwtSecurityToken.Claims.First(x => x.Type == "cognito:groups").Value;
      }
      catch (Exception)
      {
        //Exception when claim is missing
        return String.Empty;
      }
    }

    /// <summary>
    /// Validate JWT signature
    /// </summary>
    /// <param name="token"></param>
    /// <returns>JwtSecurityToken</returns>
    private JwtSecurityToken? ValidateJwtSignature(string token)
    {
      var tokenHandler = new JwtSecurityTokenHandler();
      var signingKeys = new JsonWebKeySet(_jwks).GetSigningKeys();
      try
      {
        tokenHandler.ValidateToken(token, new TokenValidationParameters
        {
          IssuerSigningKeys = signingKeys,
          ValidateIssuerSigningKey = true,
          ValidateIssuer = false,
          ValidateLifetime = true,
          ValidateAudience = false,
          ClockSkew = TimeSpan.Zero //set expiration time same as JWT expiration time
        }, out SecurityToken validatedToken);

        var jwtToken = (JwtSecurityToken)validatedToken;
        return jwtToken;
      }
      catch (Exception)
      {
        // return null if JWT validation fails
        return null;
      }
    }

    /// <summary>
    /// Get API GW access policy document
    /// </summary>
    /// <param name="userGroup"></param>
    /// <returns>string</returns>
    private string GetApiGwAccessPolicy(string userGroup)
    {
      var data = _context.LoadAsync<DynamoDbTableModel>(userGroup).Result;
      if (data != null)
      {
        return data.ApiGwAccessPolicy;
      }

      return String.Empty;
    }

    /// <summary>
    /// Get API GW deny policy document
    /// </summary>
    /// <returns>string</returns>
    private string GetDenyPolicy()
    {
      string denyPolicy = "{\"Version\": \"2012-10-17\",\"Statement\": [ {\"Effect\": \"Deny\",\"Principal\": \"*\", \"Action\": [\"execute-api:Invoke\"], \"Resource\": [ \"arn:aws:execute-api:*:*:*\"]}]}";
      return denyPolicy;
    }
  }
}