using System;
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.CustomResources;

namespace CustomResourceCloudFrontInvalidate.Invalidation
{
    public class CloudFrontInvalidate
    {

      internal CloudFrontInvalidate(
            Constructs.Construct scope,
            string id,
            CloudFrontInvalidateProps props = null
        )
        {
              var invPaths = new List<string>();
              if (props.InvalidationPaths is not null)
              {
                invPaths.AddRange(props.InvalidationPaths);
              } else {
                invPaths.Add("/*");
              }
              var paths = invPaths.ToArray();

              new AwsCustomResource(
                scope,
                $"{id}-invalidation",
                new AwsCustomResourceProps
                {
                    FunctionName = $"{id}-invalidation",
                    ResourceType = "Custom::CloudFrontInvalidation",
                    // If there is no OnCreate field, OnUpdate runs on create as well
                    OnUpdate = new AwsSdkCall
                    {
                        Service = "CloudFront",
                        Action = "createInvalidation",
                        Parameters = new Dictionary<string,object>
                        {
                            { "DistributionId", props.DistributionId },
                            { "InvalidationBatch",
                                new Dictionary<string,object>
                                {
                                    { "Paths",
                                        new Dictionary<string,object>
                                        {
                                            { "Quantity",  paths.Length },
                                            { "Items", paths }
                                        }
                                    },
                                    { "CallerReference", DateTime.Now.Ticks.ToString() }
                                }
                            }
                        },
                        PhysicalResourceId = PhysicalResourceId.FromResponse("Invalidation.Id")
                    },
                    Policy = AwsCustomResourcePolicy.FromSdkCalls(
                        new SdkCallsPolicyOptions
                        {
                            Resources = AwsCustomResourcePolicy.ANY_RESOURCE
                        }
                    )
                }
            );
        }
    }
}
