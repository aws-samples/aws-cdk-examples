import * as http from 'http';


export const handler = async (): Promise<any> => {
	// retrieve AppConfig configuration data from Lambda extension
	const res: any = await new Promise((resolve) => {
		http.get(
			`http://localhost:2772/applications/AppConfigSampleApplication/environments/AppConfigSampleLambdaDevelopmentEnvironment/configurations/AppConfigSampleConfigurationProfile`,
			resolve
		);
	});

	let configData: any = await new Promise((resolve, reject) => {
		let data = '';
		res.on('data', (chunk: any) => data += chunk);
		res.on('error', (err: any) => {
			console.log(err);
			reject(err);
		});
		res.on('end', () => resolve(data));
	});

	let result: {name: String}[] = getServices();
	const parsedConfigData = JSON.parse(configData);

	// implement feature toggle that filters results using configuration data
	if ( (parsedConfigData.boolEnableLimitResults) && parsedConfigData.intResultLimit ) {
		result = result.splice(0, parsedConfigData.intResultLimit);
	}

	return result;
}

const getServices = () => {
	return [
		{
			name: 'AWS AppConfig'
		},
		{
			name: 'Amazon SageMaker Studio'
		},
		{
			name: 'Amazon Kendra'
		},
		{
			name: 'Amazon CodeGuru'
		},
		{
			name: 'Amazon Fraud Detector'
		},
		{
			name: 'Amazon EKS on AWS Fargate'
		},
		{
			name: 'AWS Outposts'
		},
		{
			name: 'AWS Wavelength'
		},
		{
			name: 'AWS Transit Gateway'
		},
		{
			name: 'Amazon Detective'
		}
	]
}