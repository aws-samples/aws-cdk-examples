package software.amazon.awscdk.examples;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import software.amazon.awscdk.CfnOutput;
import software.constructs.Construct;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.certificatemanager.DnsValidatedCertificate;
import software.amazon.awscdk.services.certificatemanager.ICertificate;
import software.amazon.awscdk.services.cloudfront.Behavior;
import software.amazon.awscdk.services.cloudfront.CloudFrontWebDistribution;
import software.amazon.awscdk.services.cloudfront.S3OriginConfig;
import software.amazon.awscdk.services.cloudfront.SSLMethod;
import software.amazon.awscdk.services.cloudfront.SecurityPolicyProtocol;
import software.amazon.awscdk.services.cloudfront.SourceConfiguration;
import software.amazon.awscdk.services.cloudfront.ViewerCertificate;
import software.amazon.awscdk.services.cloudfront.ViewerCertificateOptions;
import software.amazon.awscdk.services.route53.ARecord;
import software.amazon.awscdk.services.route53.HostedZone;
import software.amazon.awscdk.services.route53.HostedZoneProviderProps;
import software.amazon.awscdk.services.route53.IHostedZone;
import software.amazon.awscdk.services.route53.RecordTarget;
import software.amazon.awscdk.services.route53.targets.CloudFrontTarget;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.deployment.BucketDeployment;
import software.amazon.awscdk.services.s3.deployment.ISource;
import software.amazon.awscdk.services.s3.deployment.Source;

public class StaticSiteStack extends Stack {

  /**
   * Static site infrastructure, which deploys site content to an S3 bucket.
   *
   * <p>The site redirects from HTTP to HTTPS, using a CloudFront distribution, Route53 alias
   * record, and ACM certificate.
   */
  public StaticSiteStack(Construct scope, String id, Map<String, Object> props) {
    super(scope, id);

    try {

      final IHostedZone zone =
          HostedZone.fromLookup(
              this,
              "Zone",
              HostedZoneProviderProps.builder()
                  .domainName(props.get("domainName").toString())
                  .build());

      final String siteDomain =
          props.get("siteSubDomain").toString() + '.' + props.get("domainName").toString();
      List<String> siteDomainList = new ArrayList<>(1);
      siteDomainList.add(siteDomain);

      // Site URL CfnOutput variable
      CfnOutput.Builder.create(this, "Site")
          .description("Site Domain Url")
          .value("https://" + siteDomain)
          .build();

      // S3 Bucket resource and Content
      Bucket siteBucket =
          Bucket.Builder.create(this, "SiteBucket")
              .bucketName(siteDomain)
              .websiteIndexDocument("index.html")
              .websiteErrorDocument("error.html")
              .publicReadAccess(false)
              // The default removal policy is RETAIN, which means that cdk destroy will not attempt
              // to delete
              // the new bucket, and it will remain in your account until manually deleted. By
              // setting the policy to
              // DESTROY, cdk destroy will attempt to delete the bucket, but will error if the
              // bucket is not empty.
              .removalPolicy(RemovalPolicy.DESTROY)
              .build();

      CfnOutput.Builder.create(this, "Bucket")
          .description("Bucket Name")
          .value(siteBucket.getBucketName())
          .build();

      // TLS certificate
      final ICertificate certificate =
          DnsValidatedCertificate.Builder.create(this, "SiteCertificate")
              .domainName(siteDomain)
              .hostedZone(zone)
              .build();

      CfnOutput.Builder.create(this, "Certificate")
          .description("Certificate ARN")
          .value(certificate.getCertificateArn())
          .build();

      // CloudFront distribution that provides HTTPS

      List<Behavior> behavioursList = new ArrayList<>(1);
      behavioursList.add(Behavior.builder().isDefaultBehavior(true).build());

      List<SourceConfiguration> sourceConfigurationsList = new ArrayList<>(1);
      sourceConfigurationsList.add(
          SourceConfiguration.builder()
              .s3OriginSource(S3OriginConfig.builder().s3BucketSource(siteBucket).build())
              .behaviors(behavioursList)
              .build());

      CloudFrontWebDistribution distribution =
              CloudFrontWebDistribution.Builder.create(this, "SiteDistribution")
                      .viewerCertificate(ViewerCertificate.fromAcmCertificate(certificate, ViewerCertificateOptions
                              .builder()
                              .aliases(siteDomainList)
                              .sslMethod(SSLMethod.SNI)
                              .securityPolicy(SecurityPolicyProtocol.TLS_V1_1_2016)
                              .build()
              ))
              .originConfigs(sourceConfigurationsList)
              .build();

      CfnOutput.Builder.create(this, "DistributionId")
          .description("CloudFront Distribution Id")
          .value(distribution.getDistributionId())
          .build();

      // Route53 alias record for the CloudFront distribution

      ARecord.Builder.create(this, "SiteAliasRecord")
          .recordName(siteDomain)
          .target(RecordTarget.fromAlias(new CloudFrontTarget(distribution)))
          .zone(zone)
          .build();

      // Deploy site contents to S3 bucket
      List<ISource> sources = new ArrayList<>(1);
      sources.add(Source.asset("./site-contents"));

      BucketDeployment.Builder.create(this, "DeployWithInvalidation")
          .sources(sources)
          .destinationBucket(siteBucket)
          .distribution(distribution)
          .build();

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
