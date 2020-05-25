require('dotenv').config();
import * as fs from 'fs-extra';
import * as util from './functions/util';

/**
 * Create web/config.js before deployment.
 * 
 * Depends on a .env file in this folder.
 * 
 */

let contents = '';

const apiDomain = util.getEnv('API_DOMAIN');
const cognitoDomain = util.getEnv('COGNITO_DOMAIN_PREFIX');
const region = util.getEnv('COGNITO_REGION');
const appClient = util.getEnv('COGNITO_APP_CLIENT_ID');
const redirect = util.getEnv('COGNITO_REDIRECT_URI');
const facebookAppId = util.getEnv('FACEBOOK_APP_ID');
const facebookVersion = util.getEnv('FACEBOOK_VERSION');

contents += 'window.FacebookExampleConfig = {};\n'
contents += `window.FacebookExampleConfig.apiUrl = "https://${apiDomain}";\n`

contents += `window.FacebookExampleConfig.federatedLogin = `;
contents += `"https://${cognitoDomain}.auth.${region}.amazoncognito.com/`;
contents += `login?response_type=code&client_id=${appClient}&redirect_uri=${redirect}";\n`

contents += `window.FacebookExampleConfig.federatedLogout = `;
contents += `"https://${cognitoDomain}.auth.${region}.amazoncognito.com/`;
contents += `logout?response_type=code&client_id=${appClient}&redirect_uri=${redirect}";\n`

contents += `window.FacebookExampleConfig.facebookAppId = "${facebookAppId}"\n`;
contents += `window.FacebookExampleConfig.facebookVersion = "${facebookVersion}"\n`;

fs.writeFileSync('./web/config.js', contents);

