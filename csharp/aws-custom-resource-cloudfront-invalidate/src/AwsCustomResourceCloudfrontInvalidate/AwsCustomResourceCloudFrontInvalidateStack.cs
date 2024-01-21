using System;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using AwsCustomResourceCloudFrontInvalidate.Invalidation;
using Constructs;

namespace AwsCustomResourceCloudFrontInvalidate
{
    public class AwsCustomResourceCloudFrontInvalidateStack : Stack
    {
        internal AwsCustomResourceCloudFrontInvalidateStack(
            Constructs.Construct scope,
            string id,
            IStackProps props = null
        ) : base(scope, id, props)
        {
            // Create Example Bucket
            Bucket bucket = new Bucket(this, $"{id}-bucket", new BucketProps()
            {
              BucketName = $"example-bucket-change-me-{ DateTime.Now.Ticks.ToString() }"
            });

            // Create Example Distribution
            Distribution dist = new Distribution(this, $"{id}-distribution", new DistributionProps{
                DefaultBehavior = new BehaviorOptions()
                {
                  Origin = new S3Origin(bucket)
                }
            });

            // Create invalidation from CloudFront Invalidation Helper Class
            new CloudFrontInvalidate(this, $"{id}-stack",
                new CloudFrontInvalidateProps()
                {
                    DistributionId = dist.DistributionId,
                    InvalidationPaths = new [] { "/*" }
                }
            );
        }
    }
}
