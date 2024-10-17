from datetime import datetime
import json
from random import randrange

def log_emitter(event, context):
    source = {}
    id = str(randrange(10000))
    source['id'] = id
    source['timestamp'] = str(datetime.now())
    source['message'] = 'Hello world'
    source['owner'] = 'aws-osi'
    
    print(json.dumps(source))
        
        
