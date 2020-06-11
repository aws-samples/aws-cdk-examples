import * as axios from 'axios';
import * as AWS from 'aws-sdk';

/**
 * Get a config value from the generated config.js, which is based on .env
 */
export const config = (name: string): string => {
    return (window as any).FacebookExampleConfig[name];
};

/**
 * Handle Facebook login events.
 * 
 * This class handles direct FB logins, without Cognito.
 */
class FacebookDirectExample {

    public async init() {

        // Load environment config
        const configFile = await axios.default({
            method: 'get',
            url: 'config.js'
        });

        // Evaluate the generated config file
        // tslint:disable-next-line: no-eval
        eval(configFile.data);

        console.info('apiUrl: ', config('apiUrl'));

        FB.init({
            appId: config('facebookAppId'),
            cookie: true,
            xfbml: true,
            version: config('facebookVersion')
        });

        FB.getLoginStatus((response) => {
            this.statusChangeCallback(response);
        });

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

    }

    public statusChangeCallback(response: fb.StatusResponse) {
        console.log('statusChangeCallback');
        console.log(response);
        if (response.status === 'connected') {
            this.testFBAPI();
        } else {
            const el = document.getElementById('fb-status');
            if (el) {
                el.innerHTML = 'Not logged in to Facebook.';
            }
        }
    }

    public testFBAPI() {
        console.log('Welcome!  Fetching your information.... ');
        FB.api('/me', (response: any) => {

            console.log('Successful login for: ' + response.name);

            (document.getElementById('fb-status') as any).innerHTML =
                'You are now logged in via Facebook, ' + response.name + '!';
        });
    }

    public checkLoginState() {
        const self = this;
        FB.getLoginStatus((response) => {
            self.statusChangeCallback.call(self, response);
        });
    }
}

(window as any).fbAsyncInit = () => {

    const facebookExample = new FacebookDirectExample();
    // tslint:disable-next-line: no-floating-promises
    facebookExample.init();

    (window as any).checkLoginState = () => {
        facebookExample.checkLoginState.call(facebookExample);
    };
};

// tslint:disable-next-line: only-arrow-functions
(function (d, s, id) {
    let js: any = d.getElementsByTagName(s)[0];
    const fjs = js;
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
