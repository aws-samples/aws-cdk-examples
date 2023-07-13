using Amazon.CDK;
using Constructs;
using Amazon.CDK.AWS.Events;
using Amazon.CDK.AWS.KinesisFirehose;
using static Amazon.CDK.AWS.KinesisFirehose.CfnDeliveryStream;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Events.Targets;

namespace EventBridgeFirehoseS3Stack
{
    /*
    CDK Code For -
    1. Create EventBridge Bus
    2. Create EventBridge Rule
    3. Create Firehose delivery stream
    4. Add S3 target to Firehose delivery stream
    5. Configure Firehose processor MetadataExtraction property
    6. Add partition key to target S3 path 
    */
    public class CdkStack : Stack
    {
        internal CdkStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
        {
            //Create EventBridge Bus
            var eventBridgeBus = new Amazon.CDK.AWS.Events.EventBus(this, "EventBridgeBus", new Amazon.CDK.AWS.Events.EventBusProps
            {
                EventBusName = "EventBridgeBus"
            });

            //Create EventBridge rule
            var eventBridgeRule = new Rule(this, "EventBridgeRule", new RuleProps
            {
                EventPattern = new EventPattern
                {
                    DetailType = new[] { "SaveToS3" }
                },
                EventBus = eventBridgeBus
            });

            //Create target S3 bucket
            var targetBucket = new Bucket(
                this,
                "TargetBucket",
                new BucketProps { Versioned = true, BlockPublicAccess = BlockPublicAccess.BLOCK_ALL }
            );

            //Create role for Firehose Delivery Stream
            var firehoseDeliveryStreamRole = new Role(this, "FirehoseDeliveryStreamRole", new RoleProps
            {
                AssumedBy = new ServicePrincipal("firehose.amazonaws.com")
            });

            //Grant access to S3 bucket
            targetBucket.GrantWrite(firehoseDeliveryStreamRole);

            //Create Firehose delivery stream
            var firehoseDeliveryStream = new CfnDeliveryStream(this, "DeliveryStream", new CfnDeliveryStreamProps
            {
                DeliveryStreamName = "DeliveryStream",
                DeliveryStreamType = "DirectPut",
                ExtendedS3DestinationConfiguration = new ExtendedS3DestinationConfigurationProperty
                {
                    BucketArn = targetBucket.BucketArn,
                    RoleArn = firehoseDeliveryStreamRole.RoleArn,
                    DynamicPartitioningConfiguration = new DynamicPartitioningConfigurationProperty
                    {
                        Enabled = true,
                    },
                    ProcessingConfiguration = new ProcessingConfigurationProperty
                    {
                        Enabled = true,
                        Processors = new object[] {
                            new ProcessorProperty(){
                                Type = "MetadataExtraction",
                                Parameters = new object[] {
                                    new ProcessorParameterProperty(){
                                        ParameterName = "MetadataExtractionQuery",
                                        ParameterValue = "{DEPARTMENT: with_entries(.key|=ascii_upcase) .DEPARTMENT|ascii_upcase}"
                                    },
                                    new ProcessorParameterProperty(){
                                        ParameterName = "JsonParsingEngine",
                                        ParameterValue = "JQ-1.6"
                                    }
                                }
                            },
                            new ProcessorProperty(){
                                Type = "AppendDelimiterToRecord",
                                Parameters = new object[] {
                                    new ProcessorParameterProperty{
                                        ParameterName = "Delimiter",
                                        ParameterValue = "\\n"
                                    }
                                }
                            }
                        }
                    },
                    Prefix = "!{partitionKeyFromQuery:DEPARTMENT}/",
                    BufferingHints = new BufferingHintsProperty
                    {
                        IntervalInSeconds = 60,
                        SizeInMBs = 64
                    },
                    CloudWatchLoggingOptions = new CloudWatchLoggingOptionsProperty
                    {
                        Enabled = true,
                        LogGroupName = "FirehoseLogs",
                        LogStreamName = "DliveryStreamLogs"
                    },
                    ErrorOutputPrefix = "FirehoseFailures/"
                }
            });

            //Filter Detail field from EventBridge event
            eventBridgeRule.AddTarget(new KinesisFirehoseStream(firehoseDeliveryStream, new KinesisFirehoseStreamProps
            {
                Message = RuleTargetInput.FromEventPath("$.detail")
            }));

            new CfnOutput(this, "S3BucketName", new CfnOutputProps
            {
                Value = targetBucket.BucketName
            });
        }
    }
}
