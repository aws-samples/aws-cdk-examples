import * as cdk from '@aws-cdk/core';
import { CfnApplication, CfnEnvironment, CfnConfigurationProfile, CfnHostedConfigurationVersion, CfnDeploymentStrategy, CfnDeployment } from '@aws-cdk/aws-appconfig';
import { Function, AssetCode, Runtime, LayerVersion } from '@aws-cdk/aws-lambda';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

export class AppConfigHostedConfigurationStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const application = new CfnApplication(this,'AppConfigApplication', {
			name: 'AppConfigSampleApplication',
			description: 'Sample AppConfig Application using CDK'
		});

		const environment = new CfnEnvironment(this, 'LambdaDevelopmentEnvironment', {
			applicationId: application.ref,
			name: 'AppConfigSampleLambdaDevelopmentEnvironment',
			description: 'Sample AppConfig Development environment for Lambda implementation'
		});

		const configurationProfile = new CfnConfigurationProfile(this, 'ConfigurationProfile', {
			applicationId: application.ref,
			name: 'AppConfigSampleConfigurationProfile',
			locationUri: 'hosted',
			description: 'Sample AppConfig configuration profile'
		});

		const hostedConfigurationProfile = new CfnHostedConfigurationVersion(this, 'HostedConfigurationProfile', {
			applicationId: application.ref,
			configurationProfileId: configurationProfile.ref,
			contentType: 'application/json',
			content: '{\"boolEnableLimitResults\": true, \"intResultLimit\":5}',
			latestVersionNumber: 1
		});

		hostedConfigurationProfile.addMetadata('description', 'Sample AppConfig hosted configuration profile content');

		const deploymentStrategy = new CfnDeploymentStrategy(this, 'DeploymentStrategy', {
			name: 'Custom.AllAtOnce',
			deploymentDurationInMinutes: 0,
			growthFactor: 100,
			finalBakeTimeInMinutes: 0,
			replicateTo: 'NONE',
			growthType: 'LINEAR',
			description: 'Sample AppConfig deployment strategy - All at once deployment (i.e., immediate)'
		});

		const deployment = new CfnDeployment(this, 'Deployment', {
			applicationId: application.ref,
			configurationProfileId: configurationProfile.ref,
			configurationVersion: '1',
			deploymentStrategyId: deploymentStrategy.ref,
			environmentId: environment.ref,
		});

		deployment.addDependsOn(hostedConfigurationProfile);

		deployment.addMetadata('description', 'Sample AppConfig initial deployment');

		const sampleAppConfigLambda = new Function(this, 'sampleAppConfigLambda', {
			code: new AssetCode('src'),
			functionName: 'SampleAppConfigLambda',
			handler: 'lambda-handler.handler',
			runtime: Runtime.NODEJS_12_X,
			environment: {
				AWS_APPCONFIG_EXTENSION_HTTP_PORT: '2772',
				AWS_APPCONFIG_EXTENSION_POLL_INTERVAL_SECONDS: '45',
				AWS_APPCONFIG_EXTENSION_POLL_TIMEOUT_MILLIS: '3000'
			},
			layers: [
				LayerVersion.fromLayerVersionArn(this, 'AppConfigLambdaExtension', 'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension:1')
			]
		});

		sampleAppConfigLambda.addToRolePolicy(
			new PolicyStatement({
				resources: [
					`arn:aws:appconfig:${this.region}:${this.account}:application/${application.ref}*`
				],
				actions: ['appconfig:GetConfiguration'],
				effect: Effect.ALLOW
			})
		);
	}
}

const app = new cdk.App();
new AppConfigHostedConfigurationStack(app, 'AppConfigHostedConfigurationStack');
app.synth();
