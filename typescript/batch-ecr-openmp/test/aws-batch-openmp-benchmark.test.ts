import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AwsBatchOpenmpBenchmark from '../lib/aws-batch-openmp-benchmark-stack';

describe('AWS Batch OpenMP Benchmark Stack', () => {
  let app: cdk.App;
  let stack: AwsBatchOpenmpBenchmark.AwsBatchOpenmpBenchmarkStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new AwsBatchOpenmpBenchmark.AwsBatchOpenmpBenchmarkStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-west-2' }
    });
    template = Template.fromStack(stack);
  });

  describe('ECR Repository', () => {
    test('creates ECR repository with correct configuration', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'openmp-benchmark',
        LifecyclePolicy: {
          LifecyclePolicyText: JSON.stringify({
            rules: [{
              rulePriority: 1,
              description: 'Keep only 10 most recent images',
              selection: {
                tagStatus: 'any',
                countType: 'imageCountMoreThan',
                countNumber: 10
              },
              action: {
                type: 'expire'
              }
            }]
          })
        }
      });
    });
  });



  describe('VPC Configuration', () => {
    test('creates VPC with correct configuration', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true
      });
    });

    test('creates public and private subnets', () => {
      // Public subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
        CidrBlock: '10.0.0.0/24'
      });

      // Private subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false,
        CidrBlock: '10.0.2.0/24'
      });
    });

    test('creates NAT Gateway for private subnet connectivity', () => {
      template.hasResourceProperties('AWS::EC2::NatGateway', {});
    });

    test('creates Internet Gateway', () => {
      template.hasResourceProperties('AWS::EC2::InternetGateway', {});
    });
  });

  describe('Security Group', () => {
    test('creates security group for Batch', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for OpenMP Batch compute environment',
        SecurityGroupEgress: [{
          CidrIp: '0.0.0.0/0',
          IpProtocol: '-1'
        }]
      });
    });
  });

  describe('IAM Roles', () => {
    test('creates Batch service role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'batch.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        },
        ManagedPolicyArns: [{
          'Fn::Join': ['', [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':iam::aws:policy/service-role/AWSBatchServiceRole'
          ]]
        }]
      });
    });

    test('creates EC2 instance role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ec2.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        },
        ManagedPolicyArns: [{
          'Fn::Join': ['', [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role'
          ]]
        }]
      });
    });

    test('creates job execution role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ecs-tasks.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }]
        },
        ManagedPolicyArns: [{
          'Fn::Join': ['', [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
          ]]
        }]
      });
    });


  });

  describe('AWS Batch Configuration', () => {
    test('creates Batch compute environment', () => {
      template.hasResourceProperties('AWS::Batch::ComputeEnvironment', {
        Type: 'MANAGED',
        State: 'ENABLED',
        ComputeResources: {
          Type: 'EC2',
          MinvCpus: 0,
          MaxvCpus: 256,
          InstanceTypes: ['c6i.large', 'c6i.xlarge', 'c6i.2xlarge', 'c5.large', 'c5.xlarge']
        }
      });
    });

    test('creates Batch job queue', () => {
      template.hasResourceProperties('AWS::Batch::JobQueue', {
        State: 'ENABLED',
        Priority: 1
      });
    });

    test('creates Batch job definition', () => {
      template.hasResourceProperties('AWS::Batch::JobDefinition', {
        Type: 'container',
        ContainerProperties: {
          Vcpus: 2,
          Memory: 4096
        }
      });
    });
  });

  describe('Lambda Function', () => {
    test('creates Lambda function for job submission', () => {
      // Filter out the custom resource Lambda functions
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const jobSubmitterFunctions = Object.entries(lambdaFunctions).filter(([key, value]: [string, any]) => {
        return key.includes('JobSubmitterFunction') || 
               (value.Properties?.Runtime === 'python3.11');
      });
      
      expect(jobSubmitterFunctions.length).toBeGreaterThanOrEqual(1);
      
      // Check for the main job submitter function properties
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.11',
        Handler: 'index.handler',
        Timeout: 300
      });
    });

    test('grants Lambda permissions for Batch operations', () => {
      // Check that the Lambda function has Batch permissions
      const policies = template.findResources('AWS::IAM::Policy');
      const jobSubmitterPolicy = Object.values(policies).find((policy: any) => 
        policy.Properties?.PolicyName?.includes('JobSubmitterFunction')
      );
      
      expect(jobSubmitterPolicy).toBeDefined();
      const statements = (jobSubmitterPolicy as any).Properties.PolicyDocument.Statement;
      
      // Find the statement with Batch permissions
      const batchStatement = statements.find((stmt: any) => 
        Array.isArray(stmt.Action) && stmt.Action.some((action: string) => action.startsWith('batch:'))
      );
      
      expect(batchStatement).toBeDefined();
      expect(batchStatement.Action).toEqual(expect.arrayContaining([
        'batch:SubmitJob',
        'batch:DescribeJobs',
        'batch:ListJobs'
      ]));
    });
  });

  describe('CloudWatch Logs', () => {
    test('creates CloudWatch log group', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7
      });
    });
  });

  describe('Stack Outputs', () => {
    test('exports important resource identifiers', () => {
      const outputs = template.findOutputs('*');
      
      expect(outputs).toHaveProperty('ECRRepositoryURI');
      expect(outputs).toHaveProperty('JobQueueName');
      expect(outputs).toHaveProperty('JobDefinitionName');
      expect(outputs).toHaveProperty('LambdaFunctionName');
    });
  });

  describe('Resource Count Validation', () => {
    test('creates expected number of resources', () => {
      // Verify we have the main resource types
      expect(Object.keys(template.findResources('AWS::ECR::Repository'))).toHaveLength(1);
      expect(Object.keys(template.findResources('AWS::EC2::VPC'))).toHaveLength(1);
      expect(Object.keys(template.findResources('AWS::Batch::ComputeEnvironment'))).toHaveLength(1);
      expect(Object.keys(template.findResources('AWS::Batch::JobQueue'))).toHaveLength(1);
      expect(Object.keys(template.findResources('AWS::Batch::JobDefinition'))).toHaveLength(1);
      expect(Object.keys(template.findResources('AWS::Logs::LogGroup')).length).toBeGreaterThanOrEqual(1);
      
      // Check Lambda functions - should have our job submitter plus potentially custom resource handlers
      const lambdaFunctions = Object.keys(template.findResources('AWS::Lambda::Function'));
      expect(lambdaFunctions.length).toBeGreaterThanOrEqual(1);
      
      // Verify we have multiple IAM roles as expected
      expect(Object.keys(template.findResources('AWS::IAM::Role')).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Script Files', () => {
    test('build-and-deploy script includes deployment info capture', () => {
      const fs = require('fs');
      const path = require('path');
      
      const scriptPath = path.join(__dirname, '..', 'scripts', 'build-and-deploy.sh');
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // Check that the script contains deployment info capture logic
      expect(scriptContent).toContain('deployment-info.json');
      expect(scriptContent).toContain('stackOutputs');
      expect(scriptContent).toContain('awsProfile');
    });
  });

  describe('Security Best Practices', () => {


    test('IAM roles follow least privilege principle', () => {
      // Verify no roles have admin access
      const policies = template.findResources('AWS::IAM::Policy');
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((statement: any) => {
          // Check that we don't have overly broad permissions
          if (Array.isArray(statement.Action)) {
            expect(statement.Action).not.toContain('*:*');
          } else if (typeof statement.Action === 'string') {
            expect(statement.Action).not.toBe('*:*');
          }
        });
      });
    });

    test('VPC uses private subnets for compute resources', () => {
      // Verify Batch compute environment uses subnets (should be private ones)
      const computeEnv = template.findResources('AWS::Batch::ComputeEnvironment');
      const computeEnvProps = Object.values(computeEnv)[0] as any;
      
      expect(computeEnvProps.Properties.ComputeResources.Subnets).toBeDefined();
      expect(Array.isArray(computeEnvProps.Properties.ComputeResources.Subnets)).toBe(true);
      expect(computeEnvProps.Properties.ComputeResources.Subnets.length).toBeGreaterThan(0);
      
      // Verify these are references to private subnets (they should contain 'PrivateSubnet' in the reference)
      const subnetRefs = computeEnvProps.Properties.ComputeResources.Subnets;
      subnetRefs.forEach((subnetRef: any) => {
        expect(subnetRef.Ref).toMatch(/.*PrivateSubnet.*/);
      });
    });
  });
});
