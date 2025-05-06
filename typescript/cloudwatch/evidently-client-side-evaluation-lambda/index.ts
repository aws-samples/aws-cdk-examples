import * as appconfig from 'aws-cdk-lib/aws-appconfig'
import * as cdk from 'aws-cdk-lib'
import * as evidently from 'aws-cdk-lib/aws-evidently'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as fs from'fs'

const HIDE_FEATURE = 'hideFeature'
const SHOW_FEATURE = 'showFeature'
const AWS_REGION: string = process.env.CDK_DEFAULT_REGION || ''
const AWS_ACCOUNT: string = process.env.CDK_DEFAULT_ACCOUNT || ''

// We must choose the Lambda Layer ARN that corresponds with the AWS Region where you create your Lambda:
// https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-versions.html#appconfig-integration-lambda-extensions-enabling-x86-64
const APP_CONFIG_EXTENSION_ARNS: Record<string, string> = {
  'us-east-1': 'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:82',
  'us-east-2': 'arn:aws:lambda:us-east-2:728743619870:layer:AWS-AppConfig-Extension:59',
  'us-west-1': 'arn:aws:lambda:us-west-1:958113053741:layer:AWS-AppConfig-Extension:93',
  'us-west-2': 'arn:aws:lambda:us-west-2:359756378197:layer:AWS-AppConfig-Extension:114',
  'ca-central-1': 'arn:aws:lambda:ca-central-1:039592058896:layer:AWS-AppConfig-Extension:59',
  'eu-central-1': 'arn:aws:lambda:eu-central-1:066940009817:layer:AWS-AppConfig-Extension:70',
  'eu-west-1': 'arn:aws:lambda:eu-west-1:434848589818:layer:AWS-AppConfig-Extension:82',
  'eu-west-2': 'arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:59',
  'eu-west-3': 'arn:aws:lambda:eu-west-3:493207061005:layer:AWS-AppConfig-Extension:60',
  'eu-north-1': 'arn:aws:lambda:eu-north-1:646970417810:layer:AWS-AppConfig-Extension:111',
  'eu-south-1': 'arn:aws:lambda:eu-south-1:203683718741:layer:AWS-AppConfig-Extension:54',
  'cn-north-1': 'arn:aws-cn:lambda:cn-north-1:615057806174:layer:AWS-AppConfig-Extension:52',
  'cn-northwest-1': 'arn:aws-cn:lambda:cn-northwest-1:615084187847:layer:AWS-AppConfig-Extension:52',
  'ap-east-1': 'arn:aws:lambda:ap-east-1:630222743974:layer:AWS-AppConfig-Extension:54',
  'ap-northeast-1': 'arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension:62',
  'ap-northeast-2': 'arn:aws:lambda:ap-northeast-2:826293736237:layer:AWS-AppConfig-Extension:70',
  'ap-northeast-3': 'arn:aws:lambda:ap-northeast-3:706869817123:layer:AWS-AppConfig-Extension:59',
  'ap-southeast-1': 'arn:aws:lambda:ap-southeast-1:421114256042:layer:AWS-AppConfig-Extension:64',
  'ap-southeast-2': 'arn:aws:lambda:ap-southeast-2:080788657173:layer:AWS-AppConfig-Extension:70',
  'ap-southeast-3': 'arn:aws:lambda:ap-southeast-3:418787028745:layer:AWS-AppConfig-Extension:37',
  'ap-south-1': 'arn:aws:lambda:ap-south-1:554480029851:layer:AWS-AppConfig-Extension:71',
  'sa-east-1': 'arn:aws:lambda:sa-east-1:000010852771:layer:AWS-AppConfig-Extension:82',
  'af-south-1': 'arn:aws:lambda:af-south-1:574348263942:layer:AWS-AppConfig-Extension:54',
  'me-south-1': 'arn:aws:lambda:me-south-1:559955524753:layer:AWS-AppConfig-Extension:54',
  'us-gov-east-1': 'arn:aws-us-gov:lambda:us-gov-east-1:946561847325:layer:AWS-AppConfig-Extension:29',
  'us-gov-west-1': 'arn:aws-us-gov:lambda:us-gov-west-1:946746059096:layer:AWS-AppConfig-Extension:29'
}

export class EvidentlyClientSideEvaluationLambdaStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // Create AppConfig resources
    const application = new appconfig.CfnApplication(this,'AppConfigApplication', {
      name: 'EvidentlyExampleProject'
    });

    const environment = new appconfig.CfnEnvironment(this, 'AppConfigEnvironment', {
      applicationId: application.ref,
      name: application.name + 'Environment'
    });

    // Create Evidently resources
    const project = new evidently.CfnProject(this, 'EvidentlyProject', {
      name: application.name,
      appConfigResource: {
        applicationId: application.ref,
        environmentId: environment.ref
      }
    });

    const feature = new evidently.CfnFeature(this, 'EvidentlyFeature', {
      project: project.name,
      name: 'MyExampleFeature',
      variations: [
        {
          booleanValue: false,
          variationName: HIDE_FEATURE
        },
        {
          booleanValue: true,
          variationName: SHOW_FEATURE
        }
      ]
    })
    feature.addDependsOn(project)

    const launch = new evidently.CfnLaunch(this, 'EvidentlyLaunch', {
      project: project.name,
      name: 'ExampleFeatureLaunch',
      executionStatus: {
        status: 'START'
      },
      groups: [
        {
          feature: feature.name,
          variation: HIDE_FEATURE,
          groupName: HIDE_FEATURE
        },
        {
          feature: feature.name,
          variation: SHOW_FEATURE,
          groupName: SHOW_FEATURE
        }
      ],
      scheduledSplitsConfig: [{
        // This must be a timestamp. Choosing a start time in the past with status START will start the launch immediately:
        // https://docs.aws.amazon.com/cloudwatchevidently/latest/APIReference/API_ScheduledSplitConfig.html#cloudwatchevidently-Type-ScheduledSplitConfig-startTime
        startTime: '2022-01-01T00:00:00Z',
        groupWeights: [
          {
            groupName: HIDE_FEATURE,
            splitWeight: 90000
          },
          {
            groupName: SHOW_FEATURE,
            splitWeight: 10000
          }
        ]
      }]
    })
    launch.addDependsOn(feature)

    // Create Lambda resources
    const configuration = `applications/${application.ref}/environments/${environment.ref}/configurations/${project.name}`
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      code: new lambda.InlineCode(fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' })),
      handler: 'index.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(this, 'ClientSideEvaluationLayer', APP_CONFIG_EXTENSION_ARNS[AWS_REGION])
      ],
      environment: {
        // This tells the AppConfig extension which AppConfig configuration to use for local evaluation.
        // It must be in the form applications/<APP_ID>/environments/<ENV_ID>/configurations/<PROJECT_NAME>
        AWS_APPCONFIG_EXTENSION_EVIDENTLY_CONFIGURATIONS: configuration,
        AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: configuration
      }
    });
    lambdaFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['appconfig:StartConfigurationSession', 'appconfig:GetLatestConfiguration'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:appconfig:${AWS_REGION}:${AWS_ACCOUNT}:application/${application.ref}/environment/${environment.ref}/configuration/*`]
      })
    )
    lambdaFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['evidently:PutProjectEvents'],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:evidently:${AWS_REGION}:${AWS_ACCOUNT}:project/${project.name}`]
      })
    )

  }
}

const app = new cdk.App();
new EvidentlyClientSideEvaluationLambdaStack(app, 'EvidentlyClientSideEvaluationLambda');
app.synth();
