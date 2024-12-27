function handler(event) {
    // you can log the entire event if you need
    // console.log(event)

    // query string validation and overwriting
    if (event.request.uri === '/' && event.request.querystring !== {}) {
        event.request.querystring = {};
    }

    // url redirects based on a list of URIs
    const domain = event.request.headers.host.value;
    const redirects = {
        '/test.html': `https://${domain}/subdir/test.html`,
        '/test': `https://${domain}/subdir/test.html`
    }
    const redirectUrl = redirects[event.request.uri];

    if (redirectUrl) {
        return {
            statusCode: 308,
            statusDescription: 'Permanent Redirect',
            headers: {
                'location': {value: redirectUrl}
            }
        };
    }

    // url validation and authorization
    if (new RegExp('^/invalid').test(event.request.uri)) {
        return {
            statusCode: 403,
            statusDescription: 'Forbidden',
        };
    }

    // header validation and overwriting
    if (event.request.headers['x-correlation-id'] && event.request.headers['x-correlation-id'].value === 'abcde') {
        event.request.headers['x-correlation-id'].value = 'random-correlation-id';
    }

    // cookie validation and overwriting
    if (event.request.cookies['foo'] && event.request.cookies['foo'].value === 'bar') {
        event.request.cookies['should-cache'] = {value: 'true'}
    }

    return event.request
}
