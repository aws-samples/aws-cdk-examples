using Amazon.CDK;

namespace CustomResourceCloudFrontInvalidate.Invalidation
{
  public class CloudFrontInvalidateProps
  {

    /// <summary>The Id of the CloudFront Distribution</summary>
    /// <remarks>
    /// Required
    /// </remarks>
    public string DistributionId;

    /// <summary>One or more path strings for the distribution
    /// to invalidate</summary>
    /// <remarks>
    /// Default: "/*"
    /// </remarks>
    public string[] InvalidationPaths;

  }
}
