import * as axios from 'axios';
import * as AWS from 'aws-sdk';

/**
 * Get a config value from the generated config.js, which is based on .env
 */
export const config = (name: string): string => {
    return (window as any).FacebookExampleConfig[name];
}

/**
 * Handle Cognito login events.
 */
class FacebookExample {

    async init() {

        // Load environment config
        const configFile = await axios.default({
            method: 'get',
            url: 'config.js'
        });

        // Evaluate the generated config file
        // tslint:disable-next-line: no-eval
        eval(configFile.data);

        console.info('apiUrl: ', config('apiUrl'));

        // Cognito Login
        document.getElementById('login')?.addEventListener('click', () => {
            const federatedLogin = config('federatedLogin');
            console.info({ federatedLogin });
            window.location.href = federatedLogin;
        });

        // Cognito Logout
        document.getElementById('logout')?.addEventListener('click', () => {
            const federatedLogout = config('federatedLogout');
            console.info({ federatedLogout });
            window.location.href = federatedLogout;
        });

        await this.checkAuthCode();
    }

    /**
     * Get a URL parameter by name.
     */
    getParameterByName(name: string, url?: string): string | null {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    /**
     * Check for the Cognito auth code in the URL.
     * 
     * If it's there, log in. 
     */
    async checkAuthCode() {
        
        const code = this.getParameterByName('code');

        if (code) {
            const data = await axios.default({
                url: `${config('apiUrl')}/decode-verify-jwt?code=${code}`,
                method: 'get'
            });

            console.log('decode-verify-jwt response: ' + JSON.stringify(data, null, 0));
        }
    }
}

(window as any).__facebookExample = new FacebookExample();
(window as any).__facebookExample.init();