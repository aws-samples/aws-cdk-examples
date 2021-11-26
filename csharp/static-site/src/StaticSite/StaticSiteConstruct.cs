using Amazon.CDK;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront;
using Constructs;
using System.Linq;

namespace StaticSite
{
    public class StaticSiteConstructProps
    {
        public string DomainName;

        public string SiteSubDomain;
    }

    public class StaticSiteConstruct : Construct
    {

        // A simple construct that contains a collection of AWS S3 buckets.
        public StaticSiteConstruct(Construct scope, string id, StaticSiteConstructProps props) : base(scope, id)
        {
            var zone = HostedZone.FromLookup(this, "Zone", new HostedZoneProviderProps
            {
                DomainName = props.DomainName
            });

            var siteDomain = (string) ($"{props.SiteSubDomain}.{props.DomainName}");
            new CfnOutput(this, "Site", new CfnOutputProps
            {
                Value = $"https://{siteDomain}"
            });

            var siteBucket = new Bucket(this, "SiteBucket", new BucketProps
            {
                BucketName = siteDomain,
                WebsiteIndexDocument = "index.html",
                WebsiteErrorDocument = "error.html",
                PublicReadAccess = true,

                // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
                // the new bucket, and it will remain in your account until manually deleted. By setting the policy to
                // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
                RemovalPolicy = RemovalPolicy.DESTROY // NOT recommended for production code
            });

            new CfnOutput(this, "Bucket", new CfnOutputProps
            {
                Value = siteBucket.BucketName
            });

            var certificateArn = new DnsValidatedCertificate(this, "SiteCertificate", new DnsValidatedCertificateProps
            {
                DomainName = siteDomain,
                HostedZone = zone
            }).CertificateArn;

            new CfnOutput(this, "Certificate", new CfnOutputProps{Value = certificateArn});

            var behavior = new Behavior();
            behavior.IsDefaultBehavior = true;

            var distribution = new CloudFrontWebDistribution(this, "SiteDistribution", new CloudFrontWebDistributionProps
            {
                AliasConfiguration = new AliasConfiguration
                {
                    AcmCertRef = certificateArn,
                    Names = new string[] {siteDomain},
                    SslMethod = SSLMethod.SNI,
                    SecurityPolicy = SecurityPolicyProtocol.TLS_V1_2016
                },
                OriginConfigs = new ISourceConfiguration[]
                {
                    new SourceConfiguration
                    {
                        S3OriginSource = new S3OriginConfig
                        {
                            S3BucketSource = siteBucket
                        },
                        Behaviors = new Behavior[] {behavior}
                    }
                }
            });

            new CfnOutput(this, "DistributionId", new CfnOutputProps
            {
                Value = distribution.DistributionId
            });

            new ARecord(this, "SiteAliasRecord", new ARecordProps
            {
                RecordName = siteDomain,
                Target = RecordTarget.FromAlias(new CloudFrontTarget(distribution)),
                Zone = zone
            });

            new BucketDeployment(this, "DeployWithInvalidation", new BucketDeploymentProps
            {
                Sources = new ISource[] {Source.Asset("./site-contents")},
                DestinationBucket = siteBucket,
                Distribution = distribution,
                DistributionPaths = new string[] {"/*"}
            });
        }
    }
}
