import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as path from 'path';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import * as cdk from 'aws-cdk-lib';
import * as evidently from 'aws-cdk-lib/aws-evidently';
import * as iam from 'aws-cdk-lib/aws-iam';

const OLD_SEARCH_BAR = 'oldSearchBar'
const NEW_SEARCH_BAR = 'fancyNewSearchBar'
const AWS_REGION: string = process.env.CDK_DEFAULT_REGION || ''
const AWS_ACCOUNT: string = process.env.CDK_DEFAULT_ACCOUNT || ''

export class EvidentlyClientSideEvaluationEcsStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // Create AppConfig resources
    const application = new appconfig.CfnApplication(this,'AppConfigApplication', {
      name: 'MyApplication'
    });

    const environment = new appconfig.CfnEnvironment(this, 'AppConfigEnvironment', {
      applicationId: application.ref,
      name: 'MyEnvironment'
    });

    // Create Evidently resources
    const project = new evidently.CfnProject(this, 'EvidentlyProject', {
      name: 'WebPage',
      appConfigResource: {
        applicationId: application.ref,
        environmentId: environment.ref
      }
    });

    const feature = new evidently.CfnFeature(this, 'EvidentlyFeature', {
      project: project.name,
      name: 'SearchBar',
      variations: [
        {
          booleanValue: false,
          variationName: OLD_SEARCH_BAR
        },
        {
          booleanValue: true,
          variationName: NEW_SEARCH_BAR
        }
      ]
    })
    feature.addDependsOn(project)

    const launch = new evidently.CfnLaunch(this, 'EvidentlyLaunch', {
      project: project.name,
      name: 'MyLaunch',
      executionStatus: {
        status: 'START'
      },
      groups: [
        {
          feature: feature.name,
          variation: OLD_SEARCH_BAR,
          groupName: OLD_SEARCH_BAR
        },
        {
          feature: feature.name,
          variation: NEW_SEARCH_BAR,
          groupName: NEW_SEARCH_BAR
        }
      ],
      scheduledSplitsConfig: [{
        // This must be a timestamp. Choosing a start time in the past with status START will start the launch immediately:
        // https://docs.aws.amazon.com/cloudwatchevidently/latest/APIReference/API_ScheduledSplitConfig.html#cloudwatchevidently-Type-ScheduledSplitConfig-startTime
        startTime: '2022-01-01T00:00:00Z',
        groupWeights: [
          {
            groupName: OLD_SEARCH_BAR,
            splitWeight: 90000
          },
          {
            groupName: NEW_SEARCH_BAR,
            splitWeight: 10000
          }
        ]
      }]
    })
    launch.addDependsOn(feature)

    // Create ECS resources
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Instantiate Fargate Service with a cluster and a local image that gets
    // uploaded to an S3 staging bucket prior to being uploaded to ECR.
    // A new repository is created in ECR and the Fargate service is created
    // with the image from ECR.
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, 'local-image')),
        environment: {
          DEPLOYMENT_TIME: new Date().getTime().toString(),
        }
      },
    });

    const configuration = `applications/${application.ref}/environments/${environment.ref}/configurations/${project.name}`
    service.taskDefinition.addContainer('AppConfigAgent', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-appconfig/aws-appconfig-agent:2.x'),
      portMappings: [{
        containerPort: 2772
      }],
      environment: {
        EVIDENTLY_CONFIGURATIONS: configuration,
        PREFETCH_LIST: configuration
      }
    })

    service.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['appconfig:StartConfigurationSession', 'appconfig:GetLatestConfiguration'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:appconfig:${AWS_REGION}:${AWS_ACCOUNT}:application/${application.ref}/environment/${environment.ref}/configuration/*`]
      })
    )
    service.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['evidently:PutProjectEvents'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:evidently:${AWS_REGION}:${AWS_ACCOUNT}:project/${project.name}`]
      })
    )

  }
}

const app = new cdk.App();
new EvidentlyClientSideEvaluationEcsStack(app, 'EvidentlyClientSideEvaluationEcs');
app.synth();
