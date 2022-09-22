import * as appconfig from 'aws-cdk-lib/aws-appconfig'
import * as cdk from 'aws-cdk-lib'
import * as evidently from 'aws-cdk-lib/aws-evidently'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as fs from'fs'

const HIDE_FEATURE = 'hideFeature'
const SHOW_FEATURE = 'showFeature'

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
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      code: new lambda.InlineCode(fs.readFileSync('lambda-handler.py', { encoding: 'utf-8' })),
      handler: 'index.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_9,
      layers: [
        // Choose the Lambda Layer ARN that corresponds with the AWS Region where you create your Lambda:
        // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-versions.html#appconfig-integration-lambda-extensions-enabling-x86-64
        lambda.LayerVersion.fromLayerVersionArn(this, 'ClientSideEvaluationLayer', 'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:82')
      ],
      environment: {
        AWS_APPCONFIG_EXTENSION_EVIDENTLY_CONFIGURATIONS: `applications/${application.ref}/environments/${environment.ref}/configurations/${project.name}`
      }
    });
    lambdaFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['evidently:PutProjectEvents', 'appconfig:StartConfigurationSession', 'appconfig:GetLatestConfiguration'],
        effect: iam.Effect.ALLOW,
        resources: ["*"]
      })
    )

  }
}

const app = new cdk.App();
new EvidentlyClientSideEvaluationLambdaStack(app, 'EvidentlyClientSideEvaluationLambda');
app.synth();
