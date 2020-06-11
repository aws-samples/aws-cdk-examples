import * as axios from 'axios';
import * as AWS from 'aws-sdk';
import * as Cookies from 'js-cookie';

/**
 * Get a config value from the generated config.js, which is based on .env
 */
export const config = (name: string): string => {
    return (window as any).FacebookExampleConfig[name];
};

/**
 * Handle Cognito login events.
 */
class FacebookExample {

    /**
     * For local testing to connect to the API.
     */
    public localJwt = "";

    /**
     * The URL to the REST API.
     */
    public apiUrl: string;

    /**
     * Initialize the page.
     */
    public async init() {

        // Load environment config
        const configFile = await axios.default({
            method: 'get',
            url: 'config.js'
        });

        // Evaluate the generated config file
        // tslint:disable-next-line: no-eval
        eval(configFile.data);

        this.localJwt = config('JWT');

        if (this.localJwt) {

            console.log('Local JWT found in config');

            Cookies.set('username', 'admin');

            const exp = new Date();
            const totalSeconds = exp.getSeconds() + 3600;
            exp.setSeconds(totalSeconds);
            Cookies.set('jwt.expires', exp.toISOString());
            Cookies.set('jwt.id', this.localJwt);
        }

        this.apiUrl = config('apiUrl');

        console.info('apiUrl: ', this.apiUrl);

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
            this.logout();
        });

        await this.checkAuthCode();
    }

    /**
     * Get a URL parameter by name.
     */
    public getParameterByName(name: string, url?: string): string | null {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        const results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    /**
     * Check to see if the user is logged in as an admin.
     */
    public isLoggedIn() {
        const c = Cookies.get("jwt.id");
        if (c) {
            return true;
        }
        return false;
    }

    /**
     * Log out.
     */
    public logout() {
        const self = this;

        const cookies = ["username", "isSuperAdmin", "jwt.id", "jwt.refresh", "jwt.expires"];

        for (const cookie of cookies) {
            Cookies.remove(cookie);
        }

        if (Cookies.get('isLocalLogin')) {
            Cookies.remove('isLocalLogin');
        } else {
            window.location.href = config('federatedLogout');
        }
    }

    /**
     * Save data from the JWT token.
     */
    public setAuthCookies(data: any) {

        const idToken = data.idToken;
        const refreshToken = data.refreshToken;
        const username = data.username;
        Cookies.set('jwt.id', idToken);
        Cookies.set('jwt.refresh', refreshToken);

        const expiresIn = data.expiresIn;
        const exp = new Date();
        const totalSeconds = exp.getSeconds() + expiresIn;
        exp.setSeconds(totalSeconds);
        Cookies.set('jwt.expires', exp.toISOString());

        Cookies.set("username", data.username);

        if (data.isSuperAdmin) {
            Cookies.set("isSuperAdmin", "true");
        } else {
            Cookies.remove("isSuperAdmin");
        }

        console.log('JWT cookies set');
    }

    public setLoginMessage(msg:string) {
        const el = document.getElementById('login-message');
        if (el) {
            el.innerHTML = msg;
        }
    }

    /**
     * Check for the Cognito auth code in the URL.
     * 
     * If it's there, log in. 
     */
    public async checkAuthCode() {

        const code = this.getParameterByName('code');

        if (code) {
            const resp = await axios.default({
                url: `${this.apiUrl}/decode-verify-jwt?code=${code}`,
                method: 'get'
            });

            console.log('decode-verify-jwt response: ' + JSON.stringify(resp, null, 0));

            this.setAuthCookies(resp.data);
            
            // Reload the page
            window.location.href = '/';
        } else {
            if (this.isLoggedIn()) {
                this.setLoginMessage('You are logged in as ' + Cookies.get('username'));

                const user = await this.aapi('userbyusername/' + Cookies.get('username'), 'get');

                const el = document.getElementById('user-data');
                if (el) {
                    el.innerText = JSON.stringify(user, null, 0);
                }
            }
        }
    }

    /**
     * Check to see if the JWT token is expired and refresh it if so.
     */
    public async checkExpiration(): Promise<boolean> {
        // Refresh the token if it is expired
        const expCookie = Cookies.get('jwt.expires');
        let expires: Date;
        if (expCookie) {
            expires = new Date(expCookie);
            if (expires < new Date()) {
                const refresh = Cookies.get('jwt.refresh');

                console.log('Refreshing jwt token: ' + refresh);

                // Refresh the token
                const resp = await axios.default({
                    url: this.apiUrl + '/' + `decode-verify-jwt?refresh=${refresh}`,
                    method: 'get'
                });

                console.log('decode-verify-jwt refresh response: ' +
                    JSON.stringify(resp, null, 0));

                this.setAuthCookies(resp.data);
            }

            return true;
        } else {
            this.logout();
            return false;
        }
    }

    /**
     * Make an authenticated API call.
     */
    public async aapi(resource: string, verb: axios.Method, data?: any) {

        // Conver the data to a string
        let dataString: string;
        if (data) {
            dataString = JSON.stringify(data);
        }
        const apiUrl = this.apiUrl + '/' + resource;

        console.info("aapi apiUrl", apiUrl);

        // Get the JWT token
        let jwt = Cookies.get('jwt.id');

        if (!jwt) {
            if (this.localJwt) {
                console.log('Using local testing jwt');
                jwt = this.localJwt;
            } else {
                console.log('No jwt, trying aapi, logging out');
                this.logout();
                return;
            }
        }

        // Inline function to make the API call
        const callApi = async () => {

            const resp = await axios.default({
                url: apiUrl,
                method: verb,
                data: dataString,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + jwt
                }
            });

            console.info({ resp });

            if (resp.status === 401) {
                // Not logged in
                this.logout();
                return;
            }

            if (resp.status === 403) {
                // Not authorized
                return;
            }

            return resp.data;
        };

        const loggedIn = await this.checkExpiration();
        jwt = Cookies.get('jwt.id');

        // If false, we should get redirected to the login page
        if (loggedIn) {
            return await callApi();
        }
    }
}

(window as any).__facebookExample = new FacebookExample();
(window as any).__facebookExample.init();