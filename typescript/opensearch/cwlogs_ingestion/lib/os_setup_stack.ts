import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, Policy, PolicyDocument, PolicyStatement, Role, AccountPrincipal, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnAccessPolicy, CfnCollection, CfnSecurityPolicy, CfnVpcEndpoint } from 'aws-cdk-lib/aws-opensearchserverless';
import { CfnPipeline } from 'aws-cdk-lib/aws-osis';
import { Construct } from 'constructs';
import { readFileSync } from "fs";

export class OpenSearchSetupStack extends Stack {
    
    private readonly STACK_NAMING_PREFIX: string = 'cw-to-os';
    private readonly STACK_RESOURCE_NAMING_PREFIX: string = 'OpenSearchSetup';
    private readonly COLLECTION_NAME: string = `${this.STACK_NAMING_PREFIX}-col`;
    private readonly DATA_ACCESS_POLICY_NAME: string = `${this.STACK_NAMING_PREFIX}-data-pol`;
    private readonly NETWORK_POLICY_NAME: string = `${this.STACK_NAMING_PREFIX}-net-pol`;
    private readonly ENCRYPTION_POLICY_NAME: string = `${this.STACK_NAMING_PREFIX}-enc-pol`;
    private readonly VPC_ENDPOINT_NAME: string = `${this.STACK_NAMING_PREFIX}-vpc`;
    private readonly PIPELINE_NAME: string = `${this.STACK_NAMING_PREFIX}-pipe`;

    public readonly ingestionEndPointURL: string;
    
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create VPC
        const vpc = new Vpc(this, `${this.STACK_RESOURCE_NAMING_PREFIX}-vpc`);

        // Create Security Group
        const securityGroup = new SecurityGroup(this, `${this.STACK_RESOURCE_NAMING_PREFIX}-security-group`, {
            description: 'Security group for OpenSearch',
            vpc: vpc,
            allowAllOutbound: true,
            });

        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
        securityGroup.connections.allowFrom(
            securityGroup,
            Port.allTraffic(),
            'Allow ingress from the same SecurityGroup',
        );
        
        // Create VPC Endpoint
        const vpcEndpoint = new CfnVpcEndpoint(this, `${this.STACK_RESOURCE_NAMING_PREFIX}VpcEndpoint`, {
            name: this.VPC_ENDPOINT_NAME,
            vpcId: vpc.vpcId,
            subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
            securityGroupIds: [securityGroup.securityGroupId],
        });
        
        // Create OpenSearch Serverless network security policy
        const cfnNetworkAccessPolicy = new CfnSecurityPolicy(this, `${this.STACK_RESOURCE_NAMING_PREFIX}NetworkPolicy`, {
          name: this.NETWORK_POLICY_NAME,
          type: 'network',
          policy: JSON.stringify([
              {
              AllowFromPublic: false,
              Rules: [
                  {
                  ResourceType: 'collection',
                  Resource: [`collection/${this.COLLECTION_NAME}`],
                  },
              ],
              SourceVPCEs: [vpcEndpoint.attrId],
              },
              {
              AllowFromPublic: true,
              Rules: [
                  {
                  ResourceType: 'dashboard',
                  Resource: [`collection/${this.COLLECTION_NAME}`],
                  },
              ],
              },
          ]),
      });

      // Create OpenSearch Serverless encryption policy
      const cfnEncryptionPolicy = new CfnSecurityPolicy(this, `${this.STACK_RESOURCE_NAMING_PREFIX}EncryptionPolicy`, {
            name: this.ENCRYPTION_POLICY_NAME,
            type: 'encryption',
            policy: JSON.stringify({
            Rules: [
                {
                ResourceType: 'collection',
                Resource: [`collection/${this.COLLECTION_NAME}`],
                }
            ],
            AWSOwnedKey: true
            })
        });

        // Create OpenSearch Serverless collection
        const cfnCollection = new CfnCollection(
            this,
            `${this.COLLECTION_NAME}Collection`,
            {
            name: this.COLLECTION_NAME,
            description: 'OpenSearch serverless collection to be used for search from CDK',
            type: 'SEARCH',
            },
        );

        cfnCollection.addDependency(cfnEncryptionPolicy);
        cfnCollection.addDependency(cfnNetworkAccessPolicy);

        // Create IAM role for OpenSearch Ingestion pipeline
        const pipelineRole = new Role(this, `${this.STACK_RESOURCE_NAMING_PREFIX}PipelineRole`, {
            roleName: `${this.STACK_RESOURCE_NAMING_PREFIX}PipelineRole`,
            assumedBy: new ServicePrincipal('osis-pipelines.amazonaws.com'),
            inlinePolicies: {
            'OSISPipelineRolePolicy': this.pipelinePolicies(cfnCollection.attrArn)
            }
        });   

        // Create OpenSearch Ingestion pipeline        
        const cfnPipeline = new CfnPipeline(this, `${this.STACK_RESOURCE_NAMING_PREFIX}Pipeline`, {
            maxUnits: 4,
            minUnits: 2,
            bufferOptions: {
              persistentBufferEnabled: true
            },
            pipelineConfigurationBody: this.getPipelineConfiguration(pipelineRole.roleArn, cfnCollection.attrCollectionEndpoint),
            pipelineName: this.PIPELINE_NAME,
        });

        this.ingestionEndPointURL = Fn.select(0, cfnPipeline.attrIngestEndpointUrls);

        cfnPipeline.addDependency(cfnCollection);

        // Create a dashboard access role
        const dashboardAccessRole = new Role(this, `${this.STACK_RESOURCE_NAMING_PREFIX}DashboardAccessRole`, {
          assumedBy: new AccountPrincipal(this.account) ,
        });
    
        dashboardAccessRole.attachInlinePolicy(
          new Policy(this, `${this.STACK_RESOURCE_NAMING_PREFIX}DashboardAccessPolicy`, {
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                resources: ['*'],
                actions: ['aoss:*'],
              }),
            ],
          }),
        );

        // Create OpenSearch Serverless data access policy
        const data_access_policy_arns: string[] = [pipelineRole.roleArn, dashboardAccessRole.roleArn];

        const cfnDataAccessPolicy = new CfnAccessPolicy(this, `${this.STACK_NAMING_PREFIX}AccessPolicy`, {
            name: this.DATA_ACCESS_POLICY_NAME,
            type: 'data',
            policy: JSON.stringify([
                {
                Rules: [
                    {
                    ResourceType: 'index',
                    Resource: [`index/${this.COLLECTION_NAME}/*`],
                    Permission: [
                        'aoss:CreateIndex',
                        'aoss:DescribeIndex',
                        'aoss:ReadDocument',
                        'aoss:WriteDocument',
                        'aoss:UpdateIndex',
                        'aoss:DeleteIndex',
                    ],
                    },
                    {
                    ResourceType: 'collection',
                    Resource: [`collection/${this.COLLECTION_NAME}`],
                    Permission: [
                        'aoss:CreateCollectionItems',
                        'aoss:DeleteCollectionItems',
                        'aoss:UpdateCollectionItems',
                        'aoss:DescribeCollectionItems',
                    ],
                    },
                ],
                Principal: data_access_policy_arns,
                },
            ]),
        });
        
        cfnDataAccessPolicy.addDependency(cfnCollection);
        cfnDataAccessPolicy.addDependency(cfnPipeline);
    }

    pipelinePolicies(collectionArn: string) {
      const policyDocument = new PolicyDocument();
      policyDocument.addStatements(
        new PolicyStatement({
          'effect': Effect.ALLOW,
          "resources": ["*"],
          "actions": [
            "aoss:BatchGetCollection"
          ]
      }));
      policyDocument.addStatements(
        new PolicyStatement({
          'effect': Effect.ALLOW,
          "resources": [collectionArn],
          "actions": [
            "aoss:APIAccessAll"
          ]
      }));
      policyDocument.addStatements(
        new PolicyStatement({
          'effect': Effect.ALLOW,
          "resources": [`arn:aws:aoss:*:${this.account}:dashboards/default`],
          "actions": [
            "aoss:DashboardsAccessAll"
          ]
      }));
      policyDocument.addStatements(
        new PolicyStatement({
          'effect': Effect.ALLOW,
          "resources": ["*"],
          "actions": [
            "aoss:CreateSecurityPolicy",
            "aoss:GetSecurityPolicy",
            "aoss:UpdateSecurityPolicy"
          ],
          "conditions": {
            "StringEquals": {
              "aoss:collection": this.COLLECTION_NAME
            }
          }
      }));
      return policyDocument;
    }

    getPipelineConfiguration(roleArn: string, collectionEndPoint: string) {
      let pipelineConfigurationTemplate = readFileSync('resources/pipeline/configuration.yaml').toString()

      const formattedPipelineConfiguration = 
      pipelineConfigurationTemplate
        .replace('<COLLECTION_ENDPOINT>', collectionEndPoint)
        .replace('<ROLE_ARN>', roleArn)
        .replace('<REGION>', this.region)
        .replace('<NETWORK_POLICY_NAME>', this.NETWORK_POLICY_NAME);

      return formattedPipelineConfiguration;
    }
}
