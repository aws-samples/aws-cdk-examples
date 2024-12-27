function handler(event) {
    // you can log the entire event if you need
    console.log(event)

    // changing the cache ttl for individual objects
    if (event.request.uri.endsWith('test.html')) {
        event.response.headers['cache-control'] = {value: 'max-age=60'}
        event.response.headers['x-test-header'] = {value: 'this is a test'}
    }

    return event.response
}
