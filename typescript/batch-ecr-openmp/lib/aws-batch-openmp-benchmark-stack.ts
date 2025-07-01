import * as cdk from 'aws-cdk-lib';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class AwsBatchOpenmpBenchmarkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /*
     * COMPLETE DELETION CONFIGURATION
     * ================================
     * This stack is configured for complete resource deletion when running 'cdk destroy':
     * 
     * - ECR Repository: emptyOnDelete=true removes all images before deletion

     * - VPC: applyRemovalPolicy(DESTROY) ensures complete VPC cleanup
     * - CloudWatch Logs: removalPolicy=DESTROY removes log groups
     * - All other resources (IAM roles, security groups, Batch resources, Lambda) 
     *   will be automatically deleted as they have no retention policies
     *
     * WARNING: Running 'cdk destroy' will permanently delete ALL data and resources!
     */


    // ECR Repository for OpenMP container
    const ecrRepository = new ecr.Repository(this, 'OpenMPRepository', {
      repositoryName: 'openmp-benchmark',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true, // Force delete all images on stack deletion
      lifecycleRules: [{
        maxImageCount: 10,
        description: 'Keep only 10 most recent images'
      }]
    });



    // VPC for Batch compute environment
    const vpc = new ec2.Vpc(this, 'OpenMPVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });
    
    // Apply removal policy to VPC to ensure complete deletion
    vpc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Security Group for Batch compute environment
    const batchSecurityGroup = new ec2.SecurityGroup(this, 'BatchSecurityGroup', {
      vpc,
      description: 'Security group for OpenMP Batch compute environment',
      allowAllOutbound: true
    });

    // IAM Role for Batch service
    const batchServiceRole = new iam.Role(this, 'BatchServiceRole', {
      assumedBy: new iam.ServicePrincipal('batch.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBatchServiceRole')
      ]
    });

    // IAM Role for EC2 instances in Batch
    const instanceRole = new iam.Role(this, 'BatchInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role')
      ]
    });



    // Instance Profile for EC2 instances
    const instanceProfile = new iam.CfnInstanceProfile(this, 'BatchInstanceProfile', {
      roles: [instanceRole.roleName]
    });

    // Launch Template for compute environment
    const launchTemplate = new ec2.LaunchTemplate(this, 'BatchLaunchTemplate', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2({
        edition: ec2.AmazonLinuxEdition.STANDARD
      }),
      securityGroup: batchSecurityGroup,
      userData: ec2.UserData.forLinux(),
      role: instanceRole
    });

    // Batch Compute Environment - using cost-effective instance types
    const computeEnvironment = new batch.CfnComputeEnvironment(this, 'OpenMPComputeEnvironment', {
      type: 'MANAGED',
      state: 'ENABLED',
      serviceRole: batchServiceRole.roleArn,
      computeResources: {
        type: 'EC2',
        minvCpus: 0,
        maxvCpus: 256,
        instanceTypes: ['c6i.large', 'c6i.xlarge', 'c6i.2xlarge', 'c5.large', 'c5.xlarge'],
        instanceRole: instanceProfile.attrArn,
        securityGroupIds: [batchSecurityGroup.securityGroupId],
        subnets: vpc.privateSubnets.map(subnet => subnet.subnetId)
      }
    });

    // Batch Job Queue
    const jobQueue = new batch.CfnJobQueue(this, 'OpenMPJobQueue', {
      state: 'ENABLED',
      priority: 1,
      computeEnvironmentOrder: [
        {
          computeEnvironment: computeEnvironment.ref,
          order: 1
        }
      ]
    });

    // IAM Role for Batch jobs
    const jobRole = new iam.Role(this, 'BatchJobRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ]
    });



    // CloudWatch Log Group for Batch jobs
    const logGroup = new logs.LogGroup(this, 'OpenMPLogGroup', {
      logGroupName: '/aws/batch/openmp-benchmark',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK
    });

    // Batch Job Definition using CloudFormation with parameter mapping
    const jobDefinition = new batch.CfnJobDefinition(this, 'OpenMPJobDefinition', {
      type: 'container',
      containerProperties: {
        image: `${ecrRepository.repositoryUri}:latest`,
        vcpus: 2,
        memory: 4096,
        jobRoleArn: jobRole.roleArn,
        executionRoleArn: jobRole.roleArn,
        // Map AWS Batch parameters to command line arguments
        command: [
          '/usr/local/bin/openmp_benchmark',
          '--size', 'Ref::size',
          '--threads', 'Ref::threads', 
          '--json', 'Ref::json',
          '--benchmark-type', 'Ref::benchmark-type',
          '--matrix-size', 'Ref::matrix-size'
        ],
        environment: [
          { name: 'AWS_DEFAULT_REGION', value: this.region }
          // OMP_NUM_THREADS now auto-detected at runtime for optimal CPU utilization
        ],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': logGroup.logGroupName,
            'awslogs-stream-prefix': 'openmp'
          }
        }
      },
      // Define parameters that can be passed from submit-job (30-min runtime, 4GB memory)
      parameters: {
        size: '600000000',
        threads: '0', 
        json: 'true',
        'benchmark-type': 'simple',
        'matrix-size': '1200'
      }
    });

    // Lambda function for job submission and monitoring
    const jobSubmitterFunction = new lambda.Function(this, 'JobSubmitterFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import uuid
from datetime import datetime

batch_client = boto3.client('batch')

def handler(event, context):
    try:
        # Parse input parameters
        problem_size = event.get('problemSize', 100000000)
        max_threads = event.get('maxThreads', 0)
        instance_type = event.get('instanceType', 't3.large')
        
        # Map instance types to optimal vCPU counts for OpenMP
        instance_vcpu_map = {
            't3.medium': 2,
            't3.large': 2,
            't3.xlarge': 4,
            't3a.medium': 2,
            't3a.large': 2,
            'c6i.large': 2,
            'c6i.xlarge': 4,
            'c6i.2xlarge': 8,
            'c6i.4xlarge': 16,
            'c6i.8xlarge': 32,
            'c5.large': 2,
            'c5.xlarge': 4,
            'c5.2xlarge': 8,
            'c5.4xlarge': 16,
            'c5.9xlarge': 36,
            'c5n.large': 2,
            'c5n.xlarge': 4,
            'c5n.2xlarge': 8
        }
        
        # Determine optimal thread count
        instance_vcpus = instance_vcpu_map.get(instance_type, 4)
        optimal_threads = max_threads if max_threads > 0 else instance_vcpus
        
        # Generate unique job name
        job_name = f"openmp-benchmark-{uuid.uuid4().hex[:8]}"
        
        # Submit batch job with dynamic resource allocation
        response = batch_client.submit_job(
            jobName=job_name,
            jobQueue='${jobQueue.ref}',
            jobDefinition='${jobDefinition.ref}',
            parameters={
                'size': str(problem_size),
                'threads': str(optimal_threads),
                'json': 'true'
            },
            containerOverrides={
                'vcpus': instance_vcpus,
                'memory': instance_vcpus * 2048,  # 2GB per vCPU
                'environment': [
                    {'name': 'AWS_BATCH_JOB_INSTANCE_TYPE', 'value': instance_type},
                    {'name': 'OMP_NUM_THREADS', 'value': str(optimal_threads)}
                ]
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'jobId': response['jobId'],
                'jobName': response['jobName'],
                'message': 'Job submitted successfully'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
      `),
      timeout: cdk.Duration.minutes(5),
      environment: {
        'JOB_QUEUE': jobQueue.ref,
        'JOB_DEFINITION': jobDefinition.ref
      }
    });

    // Grant Lambda permissions to submit Batch jobs
    jobSubmitterFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'batch:SubmitJob',
        'batch:DescribeJobs',
        'batch:ListJobs'
      ],
      resources: ['*']
    }));



    // Outputs
    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: ecrRepository.repositoryUri,
      description: 'ECR Repository URI for OpenMP container'
    });

    new cdk.CfnOutput(this, 'JobQueueName', {
      value: jobQueue.ref,
      description: 'Batch Job Queue Name'
    });

    new cdk.CfnOutput(this, 'JobDefinitionName', {
      value: jobDefinition.ref,
      description: 'Batch Job Definition Name'
    });



    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: jobSubmitterFunction.functionName,
      description: 'Lambda function for job submission'
    });
  }
}
