using System;
using System.Threading.Tasks;
using System.Net.Http;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using Amazon.CDK.AWS.WAFv2;
using Constructs;
using static Amazon.CDK.AWS.WAFv2.CfnWebACL;

namespace CloudFrontS3WafStack
{
    /*
    CDK Code For -
    1. Create S3 bucket Static Website - index.html with H1 html tag
    2. Create CloudFront with limited region deployment (to reduce cost) to serve static website
    3. Secure CloudFront through WAF IP range rule
    */
    public class CdkStack : Stack
    {
        internal CdkStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
        {
            //S3 bucket for Static website
            var staticWebsiteBucket = new Bucket(
                this,
                "static-website-bucket",
                new BucketProps { Versioned = true }
            );

            //Upload index.html to S3 bucket
            new BucketDeployment(
                this,
                "DeployFiles",
                new BucketDeploymentProps()
                {
                    Sources = new[] { Source.Asset("src/Website") },
                    DestinationBucket = staticWebsiteBucket
                }
            );

            //Get the local machine Ip address.    
            var localIpAddress = GetIpAddressAsync().Result + "/32";

            //Restrict website access based on IP address by creating WAF Web ACL
            CfnIPSet cfnIPSet = new CfnIPSet(
                this,
                "AllowedIPs",
                new CfnIPSetProps
                {
                    Addresses = new string[] { localIpAddress }, //Provide list of allowed IP address. You can provide CIDR address as well.
                    IpAddressVersion = "IPV4",
                    Scope = "CLOUDFRONT"
                }
            );

            CfnWebACL cfnWebACL = new CfnWebACL(
                this,
                "WebACL",
                new CfnWebACLProps
                {
                    DefaultAction = new DefaultActionProperty
                    {
                        Block = new BlockActionProperty
                        {
                            CustomResponse = new CustomResponseProperty { ResponseCode = 403 }
                        }
                    },
                    Scope = "CLOUDFRONT",
                    VisibilityConfig = new VisibilityConfigProperty
                    {
                        CloudWatchMetricsEnabled = true,
                        MetricName = "WebACLMetric",
                        SampledRequestsEnabled = true
                    },
                    Rules = new[]
                    {
                        new RuleProperty
                        {
                            Name = "WebACLRule",
                            Priority = 1,
                            Statement = new StatementProperty
                            {
                                IpSetReferenceStatement = new IPSetReferenceStatementProperty
                                {
                                    Arn = cfnIPSet.AttrArn
                                }
                            },
                            VisibilityConfig = new VisibilityConfigProperty
                            {
                                CloudWatchMetricsEnabled = true,
                                MetricName = "WebACLRuleMetric",
                                SampledRequestsEnabled = true
                            },
                            Action = new RuleActionProperty { Allow = new AllowActionProperty() }
                        }
                    }
                }
            );

            //Create CloudFront distribution
            var CloudFrontDistribution = new Distribution(
                this,
                "CloudFront-distribution",
                new DistributionProps()
                {
                    DefaultBehavior = new BehaviorOptions
                    {
                        Origin = new S3Origin(staticWebsiteBucket),
                    },
                    WebAclId = cfnWebACL.AttrArn,
                    PriceClass = PriceClass.PRICE_CLASS_100 //Optional property. Choose price class based on Website user location.  
                }
            );

            //Observe index.html in the url. If we want to auto route to index.html then we can use CloudFront function to redirect requet to index.html.
            new CfnOutput(
                this,
                "CloudFront URL",
                new CfnOutputProps
                {
                    Value = string.Format(
                        "https://{0}/index.html",
                        CloudFrontDistribution.DomainName
                    )
                }
            );
        }

        private async Task<string> GetIpAddressAsync()
        {
            HttpClient client = new HttpClient();
            string ipAddress = await client
                .GetStringAsync("http://checkip.amazonaws.com/")
                .ConfigureAwait(continueOnCapturedContext: false);
            return ipAddress.Replace("\n", "");
        }
    }
}
