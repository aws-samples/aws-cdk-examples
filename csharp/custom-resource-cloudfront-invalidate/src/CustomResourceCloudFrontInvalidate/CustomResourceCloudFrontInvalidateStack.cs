using System;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using CustomResourceCloudFrontInvalidate.Invalidation;
using Constructs;

namespace CustomResourceCloudFrontInvalidate
{
    public class CustomResourceCloudFrontInvalidateStack : Stack
    {
      internal CustomResourceCloudFrontInvalidateStack(
        Constructs.Construct scope,
        string id,
        IStackProps props = null
      ) : base(scope, id, props)
      {
        // Create Example Bucket
        Bucket bucket = new Bucket(this, $"{id}-bucket", new BucketProps()
        {
          BucketName = $"example-bucket-change-me-to-a-globally-unique-name"
        });

        // Change this string and re-deploy to test invalidation
        var data = "Your CloudFront Invalidation stack worked!";

        // Create Bucket Deployment so we can test to make sure site works
        BucketDeployment bucketDeployment = new BucketDeployment(this, $"{id}-deployment", new BucketDeploymentProps()
        {
          DestinationBucket = bucket,
          Sources = new []
          {
            Source.Data("index.html", $"<h1>{data}</h1>")
          }
        });

      // Create Example Distribution
            Distribution dist = new Distribution(this, $"{id}-distribution", new DistributionProps{
                DefaultBehavior = new BehaviorOptions()
                {
                  Origin = new S3Origin(bucket)
                },
                // Set this so that you don't have to add "/index.html" to get to main content
                DefaultRootObject = "index.html"
            });

            // Create invalidation from CloudFront Invalidation Helper Class
            new CloudFrontInvalidate(this, $"{id}-stack",
                new CloudFrontInvalidateProps()
                {
                    DistributionId = dist.DistributionId,
                    InvalidationPaths = new [] { "/*" }
                }
            );

            // Export distribution url to easily check success or failure of deployment
            new CfnOutput(this, "cloudfront-url-output", new CfnOutputProps()
            {
                Value = dist.DomainName,
                ExportName = "cloudfront-domain"
            });
      }
    }
}
