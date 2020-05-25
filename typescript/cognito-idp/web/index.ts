import * as axios from 'axios';

/**
 * Get a config value from the generated config.js, which is based on .env
 */
export const config = (name: string): string => {
    return (window as any).FacebookExampleConfig[name];
}

/**
 * Handle Facebook login events.
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
            window.location.href = config('federatedLogin');
        });

        // Cognito Logout
        document.getElementById('logout')?.addEventListener('click', () => {
            window.location.href = config('federatedLogout');
        });

    }

    statusChangeCallback(response: fb.StatusResponse) {
        console.log('statusChangeCallback');
        console.log(response);
        if (response.status === 'connected') {
            this.testFBAPI();
        } else {
            const el = document.getElementById('status');
            if (el) {
                el.innerHTML = 'Please log in.';
            }
        }
    }

    testFBAPI() {
        console.log('Welcome!  Fetching your information.... ');
        FB.api('/me', (response: any) => {

            console.log('Successful login for: ' + response.name);

            (document.getElementById('status') as any).innerHTML =
                'Thanks for logging in, ' + response.name + '!';
        });
    }

    checkLoginState() {               // Called when a person is finished with the Login Button.
        FB.getLoginStatus((response) => {   // See the onlogin handler
            this.statusChangeCallback(response);
        });
    }
}








(window as any).fbAsyncInit = () => {

    const facebookExample = new FacebookExample();
    // tslint:disable-next-line: no-floating-promises
    facebookExample.init();

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

