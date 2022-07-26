# this function
# gets the simple html page
# updates the login page and logout page address
# returns the content

def handler(event, context):
    login_page = event["headers"]["Referer"]

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/html'
        },
        'body': file_get_contents("index.html").replace('###loginPage###', login_page)
    }

def file_get_contents(filename):
    with open(filename) as f:
        return f.read()