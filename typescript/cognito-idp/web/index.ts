
/**
 * Handle Facebook login events.
 */
export class FacebookExample {

    public static init() {
        FB.init({
            appId: '{your-app-id}',
            cookie: true,
            xfbml: true,
            version: '{api-version}'
        });

        FB.AppEvents.logPageView();


        FB.getLoginStatus((response) => {
            FacebookExample.statusChangeCallback(response);
        });
    }

    public static checkLoginState() {
        FB.getLoginStatus((response) => {
            FacebookExample.statusChangeCallback(response);
        })
    }

    public static statusChangeCallback(response: fb.StatusResponse) {
        console.info({response});
    }

    // These will be populated by config.js, which is generated based on .env

    public static apiUrl:string;
    public static federatedLogin:string;
    public static federatedLogout:string;
}

// tslint:disable-next-line: only-arrow-functions
(function (d, s, id) {
    let js: any = d.getElementsByTagName(s)[0];
    const fjs: any = js;
    if (d.getElementById(id)) { return; }
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));