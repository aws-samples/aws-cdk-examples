using System;
using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.AutoScaling;

namespace ResourceOverrides
{
    public class ResourceOverridesStack : Stack
    {
        public ResourceOverridesStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var otherBucket = new Bucket(this, "Other");

            var bucket = new Bucket(this, "MyBucket", new BucketProps {
                Versioned = true,
                Encryption = BucketEncryption.KMS_MANAGED
            });

            // A S3.Bucket is of Type Bucket, but the underlying resource is technically a S3.CfnBucket
            var bucketResource2 = (CfnBucket) bucket.Node.DefaultChild;

            bucketResource2.AddPropertyOverride("BucketEncryption.ServerSideEncryptionConfiguration.0.EncryptEverythingAndAlways", true);
            bucketResource2.AddPropertyDeletionOverride("BucketEncryption.ServerSideEncryptionConfiguration.0.ServerSideEncryptionByDefault");

            var bucketResource = (CfnBucket) bucket.Node.DefaultChild;
            
            Func<CfnResource, Boolean> isBucket = x => x.CfnResourceType == "AWS::S3::Bucket";
            var anotherWay = (CfnBucket) Array.Find(bucket.Node.Children, (x) => {return isBucket((CfnResource) x);});

            bucketResource.Node.AddDependency((CfnResource) otherBucket.Node.DefaultChild);
            
            var metadata = new Dictionary<string, object>();
            metadata.Add("MetadataKey", "MetadataValue");
            bucketResource.CfnOptions.Metadata = metadata;
            
            bucketResource.CfnOptions.UpdatePolicy = new CfnUpdatePolicy{AutoScalingRollingUpdate= new CfnAutoScalingRollingUpdate{PauseTime="390"}};
            
            bucketResource.AddOverride("Type", "AWS::S3::Bucketeer"); // even "Type" can be overridden
            bucketResource.AddOverride("Transform", "Boom");

            // This doesn;t work for soem reason
            // String[] bar = {"A", "B"};
            // var cors = new {Custom = 123, Bar = bar};
            // bucketResource.AddOverride("Properties.Cors", cors);

            // addPropertyOverride simply allows you to omit the "Properties." prefix
            bucketResource.AddPropertyOverride("VersioningConfiguration.Status", "NewStatus");
            bucketResource.AddPropertyOverride("Token", otherBucket.BucketArn); // use tokens
            bucketResource.AddPropertyOverride("LoggingConfiguration.DestinationBucketName", otherBucket.BucketName);

            // NEED TO SKIP THE FOLLOWING FOR NOW
            //
            // Assign completely new property value
            //bucketResource.analyticsConfigurations = [
            //    {
            //        id: 'config1',
            //        storageClassAnalysis: {
            //            dataExport: {
            //                outputSchemaVersion: '1',
            //                destination: {
            //                    format: 'html',
            //                    bucketArn: otherBucket.bucketArn // use tokens freely
            //                }
            //            }
            //        }
            //    }
            //
            //// Or selectively override parts of it
            //bucketResource.addPropertyOverride('CorsConfiguration.CorsRules', [
            //    {
            //        AllowedMethods: [ 'GET' ],
            //        AllowedOrigins: [ '*' ]
            //    }
            //]);

            //
            // It is also possible to request a deletion of a value by either assigning
            // `undefined` (in supported languages) or use the `addDeletionOverride` method
            //
            bucketResource.AddDeletionOverride("Metadata");
            bucketResource.AddPropertyDeletionOverride("CorsConfiguration.Bar");


            var vpc = new Vpc(this, "VPC", new VpcProps{MaxAzs = 1});
            var asg = new AutoScalingGroup(this, "ASG", new AutoScalingGroupProps{
                InstanceType = InstanceType.Of(InstanceClass.MEMORY4, InstanceSize.XLARGE),
                MachineImage = new AmazonLinuxImage(),
                Vpc = vpc
            });

            var lc = (CfnLaunchConfiguration) asg.Node.FindChild("LaunchConfig");
            lc.AddPropertyOverride("Foo.Bar", "Hello");

        }
    }
}
