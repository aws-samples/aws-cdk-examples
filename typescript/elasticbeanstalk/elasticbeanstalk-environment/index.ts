import cdk = require('@aws-cdk/cdk');
import elasticbeanstalk = require('@aws-cdk/aws-elasticbeanstalk');


export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		//objects for access parameters
		const construct = new cdk.Construct(this, 'construct');
		const node = new cdk.ConstructNode(construct, this, 'node');

		const platform  = node.getContext("platform");


		const app = new elasticbeanstalk.CfnApplication(this, 'Application' ,{
			applicationName: "MyApp"
		});
	
		const env = new elasticbeanstalk.CfnEnvironment(this, 'Environment' ,{
			environmentName: 'MyRepositoryName',
			applicationName: "MyApp",
			platformArn: platform
		});
	
	}}