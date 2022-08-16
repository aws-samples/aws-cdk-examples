using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.StepFunctions;
using Amazon.CDK.AWS.Transfer;
using Constructs;
using System;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using Amazon.CDK.AWS.SNS;
using Amazon.CDK.AWS.SQS;
using System.IO;
using System.Collections.Generic;

namespace SftpDataImportCdk
{
    public class SftpDataImportCdkStack : Stack
    {
        internal SftpDataImportCdkStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            // Set Username for SFTP access
            var userName = "SFTPDataImportCDKUser";

            //var initCommand = new ShellScriptAction();

            // Create S3 Bucket for SFTP Upload
            //var rand = new Random();
            //int randNumber = rand.Next(100000);
            var s3Bucket = new Bucket(this, "sftpDataImportBucket", new BucketProps
            {
                //BucketName = ("sftp-data-import-cdk-bucket-" +randNumber).ToLower(),
                RemovalPolicy = RemovalPolicy.DESTROY,
                AutoDeleteObjects = true,
                EventBridgeEnabled = true
            });
            var s3Deploy = new BucketDeployment(this, "CreateFolders", new BucketDeploymentProps
            {
                Sources = new []{Source.Data($"./home/{userName}/initObject.txt", "")},
                DestinationBucket = s3Bucket
            });
            
            // Construct build option for compiling dotnet core lambdas
            System.Console.WriteLine(Runtime.DOTNET_CORE_3_1.BundlingImage);
            var buildOption = new BundlingOptions()
            {
                Image = Runtime.DOTNET_CORE_3_1.BundlingImage,
                User = "root",
                OutputType = BundlingOutput.ARCHIVED,
                Command = new string[]{
               "/bin/sh",
                "-c",
                "dotnet tool install -g Amazon.Lambda.Tools"+
                " && dotnet build"+
                " && dotnet lambda package --output-package /asset-output/function.zip"
                }
            };
            
            // Validation Lambda Function
            var ValidationFunction = new Function(this, "Validation", new FunctionProps
            {
                Runtime = Runtime.DOTNET_CORE_3_1,
                Description = "SFTP Data Import validation function",
                Handler = "Validate::Validate.Function::FunctionHandler",
                FunctionName = "Validation",
                Code = Code.FromAsset("./src/functions/Validate/", new Amazon.CDK.AWS.S3.Assets.AssetOptions
                {
                    Bundling = buildOption
                }),
            });

            // ProcessData Lambda Function
             var ProcessDataFunction = new Function(this, "ProcessData", new FunctionProps
            {
                Runtime = Runtime.DOTNET_CORE_3_1,
                Description = "SFTP Data Import processData function",
                Handler = "ProcessData::ProcessData.Function::FunctionHandler",
                FunctionName = "ProcessData",
                Code = Code.FromAsset("./src/functions/ProcessData", new Amazon.CDK.AWS.S3.Assets.AssetOptions
                {
                    Bundling = buildOption
                }),
            });

            //Create the DynamoDB Table
            var dynamoDbTable = new Table(this, "SftpDataImportDB", new TableProps 
            {
                TableName = "SFTP-Data-Import",
                PartitionKey = new Amazon.CDK.AWS.DynamoDB.Attribute
                {
                    Name = "DateTime",
                    Type = AttributeType.STRING
                },
                SortKey = new Amazon.CDK.AWS.DynamoDB.Attribute
                {
                    Name = "Customer",
                    Type = AttributeType.NUMBER
                },
                ReadCapacity = 1,
                WriteCapacity = 1,
             RemovalPolicy = RemovalPolicy.DESTROY
             });

            //Create SNS Topic
            var snsTopic = new Topic(this, "SftpDataImportSNSTopic", new TopicProps
            {
                TopicName = "SFTPDataImport"
            });

            //Create SQS
            var sqs = new Queue(this, "SftpDataImportSQS", new QueueProps
            {
                QueueName = "SFTPDataImport"
            });
            
            // Create State Machine policy
            //  allow minimum and specific access for each service action
            var SftpDataImportRole = new Role(this, "SftpDataImportRole", new RoleProps
            {
                AssumedBy = new ServicePrincipal("states.amazonaws.com"),
                RoleName = "SftpDataImportRole-CDK"
            });
            dynamoDbTable.GrantWriteData(SftpDataImportRole);
            ValidationFunction.GrantInvoke(SftpDataImportRole);
            ProcessDataFunction.GrantInvoke(SftpDataImportRole);
            snsTopic.GrantPublish(SftpDataImportRole);
            sqs.GrantSendMessages(SftpDataImportRole);
            s3Bucket.GrantDelete(SftpDataImportRole);
            
            //  Get JSON file for State Machine and replace selected items with values from current build
            string smJson = File.ReadAllText(@"./src/SftpDataImportStateMachine.json");
            
            // SFTPDataImport State Machine
            var stateMachine = new CfnStateMachine(this, "SFTPDataImport", new CfnStateMachineProps
            {
                DefinitionString = smJson,
                // Replace the placeholders in the DefinitionString with arns and queue created by CDK
                DefinitionSubstitutions = new Dictionary<string, string>
                    {
                        {"ValidationFunctionARN", ValidationFunction.FunctionArn},
                        {"PocessDataFunctionARN", ProcessDataFunction.FunctionArn},
                        {"SNSTopicARN", snsTopic.TopicArn},
                        {"SQSQueueURL", sqs.QueueUrl}
                    },
                StateMachineName = "SFTP-Data-Import-State-Machine",
                RoleArn = SftpDataImportRole.RoleArn
            });
            
            // Create Role for Event Bridge
            var SftpDataImportEBRole = new Role(this, "SftpDataImportEBRole", new RoleProps
            {
                AssumedBy = new ServicePrincipal("events.amazonaws.com"),
                RoleName = "SftpDataImportEBRole-CDK"
            });
            SftpDataImportEBRole.AddToPolicy(new PolicyStatement(new PolicyStatementProps
            {
                Resources = new string[]{$"{stateMachine.AttrArn}"},
                Actions = new string[]
                {
                    "states:StartExecution"
                },
                Effect = Effect.ALLOW
            }));
            

            //Create EventBridge Event to trigger from S3 Object Create
            var cfnRule = new Amazon.CDK.AWS.Events.CfnRule(this, "SFTPDataImportEBRule", new Amazon.CDK.AWS.Events.CfnRuleProps
            {
                EventPattern = new Dictionary<string, object>
                    {
                            ["detail-type"] = new string[]{"Object Created"},
                            ["source"] = new string[]{"aws.s3"},
                            ["detail"] = new Dictionary<string, object>
                            {
                                ["bucket"] = new Dictionary<string, object>
                                {
                                    {
                                        "name", new string[]{ s3Bucket.BucketName, $"/{s3Bucket.BucketName}/home/{userName}" }
                                    }
                                }
                            }
                    },
                Name = "SFTPDataImportEBRule-CDK"
            });
            cfnRule.Description = "S3 Object Create Rule for SFTP Data Import State Machine - CDK Example";
            // Add State Machine as a target and new EventBridge IAM Role arn
            cfnRule.Targets = new Dictionary<string, object>[]
                {
                    new Dictionary<string, object> {
                        ["roleArn"] = SftpDataImportEBRole.RoleArn,
                        ["arn"] = stateMachine.AttrArn,
                        ["id"] = stateMachine.LogicalId
                    }
                };

            // Create SFTP Transfer Family Server
            var SFTPServer = new CfnServer(this, "SFTPDataImportCDK", new CfnServerProps
            {
                Protocols = new string[]{"SFTP"},
                IdentityProviderType = "SERVICE_MANAGED"
            });

            // Create IAM Role for User
            var SftpDataImportUserRole = new Role(this, "SftpDataImportUserRole", new RoleProps
            {
                AssumedBy = new ServicePrincipal("transfer.amazonaws.com"),
                RoleName = "SftpDataImportUserRole-CDK"
            });
            SftpDataImportUserRole.AddToPolicy(new PolicyStatement(new PolicyStatementProps
            {
                Resources = new string[]{s3Bucket.BucketArn},
                Sid = "AllowListingofUserFolder",
                Actions = new string[]{"s3:ListBucket"},
                Effect = Effect.ALLOW
            }));
            SftpDataImportUserRole.AddToPolicy(new PolicyStatement(new PolicyStatementProps
            {
                Resources = new string[]{$"{s3Bucket.BucketArn}/home/{userName}/*"},
                Sid = "HomeDirObjectAccess",
                Actions = new string[]
                {
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:DeleteObjectVersion",
                    "s3:GetBucketLocation",
                    "s3:GetObjectVersion",
                    "s3:GetObjectACL",
                    "s3:PutObjectACL"
                },
                Effect = Effect.ALLOW
            }));

            
            // Create User for SFTP Server
            // * Uses the home directory as /{BucketName}/home/{UserName}
            var SFTPUser = new Amazon.CDK.AWS.Transfer.CfnUser(this, "SFTPUserCDK", new Amazon.CDK.AWS.Transfer.CfnUserProps
            {
                Role = SftpDataImportUserRole.RoleArn,
                ServerId = SFTPServer.AttrServerId,
                UserName = userName,
                HomeDirectory = $"/{s3Bucket.BucketName}/home/{userName}"
            });
        }
    }
}
