import { Handler, APIEventResponse } from './handler';
import * as AWS from 'aws-sdk';
import * as util from './util';

const s3 = new AWS.S3();

/**
 * Creates config.js at the root of the S3 bucket.
 * 
 * We do this with a custom resource because the web app needs deploy-time values.
 */
class CreateConfigHandler {

    /**
     * The event handler.
     */
    public async handle(event: any): Promise<any> {
        try {

            console.info({ event });

            const requestType = event.RequestType;
            const s3BucketName = util.getEnv('S3_BUCKET_NAME');
            let contents = '';

            if (requestType === 'Create' || requestType === 'Update') {
                const configFileName = 'config.js';

                const apiDomain = util.getEnv('API_DOMAIN');
                const cognitoDomain = util.getEnv('COGNITO_DOMAIN_PREFIX');
                const region = util.getEnv('COGNITO_REGION');
                const appClient = util.getEnv('COGNITO_APP_CLIENT_ID');
                const redirect = util.getEnv('COGNITO_REDIRECT_URI');
                const facebookAppId = util.getEnv('FACEBOOK_APP_ID');
                const facebookVersion = util.getEnv('FACEBOOK_VERSION');

                contents += 'window.FacebookExampleConfig = {};\n';
                contents += `window.FacebookExampleConfig.apiUrl = "https://${apiDomain}";\n`;

                contents += `window.FacebookExampleConfig.federatedLogin = `;
                contents += `"https://${cognitoDomain}.auth.${region}.amazoncognito.com/`;
                contents += `login?response_type=code&client_id=${appClient}&redirect_uri=${redirect}";\n`;

                contents += `window.FacebookExampleConfig.federatedLogout = `;
                contents += `"https://${cognitoDomain}.auth.${region}.amazoncognito.com/`;
                contents += `logout?response_type=code&client_id=${appClient}&redirect_uri=${redirect}";\n`;

                contents += `window.FacebookExampleConfig.facebookAppId = "${facebookAppId}"\n`;
                contents += `window.FacebookExampleConfig.facebookVersion = "${facebookVersion}"\n`;

                // Write the file to S3
                await s3.putObject({
                    Bucket: s3BucketName,
                    Key: configFileName,
                    Body: contents
                }).promise();

                console.log('Wrote config.js to ' + s3BucketName);

            } else {
                // TODO - Do we care about other request types?
                console.log('Received request type: ' + requestType);
            }

            return {
                PhysicalResourceId: s3BucketName, 
                Data: {contents}
            };

        } catch (ex) {
            console.error(ex);
            throw ex;
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: any) => {
    const h = new CreateConfigHandler();
    return h.handle(event);
};