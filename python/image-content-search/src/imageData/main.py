from helper.insert import insert_new_image  # type: ignore
from helper.migration import create_schema  # type: ignore
from helper.search import search_label, get_http_params  # type: ignore

# this function
# based on the source:
# 1- gets the event from Amazon EventBridge for date mutation
# 2- gets then event from CloudFormation for schema creation
# 3- gets the event from API Gateway for data query
# return the suitable data

def handler(event, context):
    # logger.info(event)

    if "ResourceProperties" in event:
        body = event["ResourceProperties"]
        for k in body: event[k] = body[k]

    if "body" in event:
        body = get_http_params(event["body"])
        for k in body: event[k] = body[k]

    source = event["source"]

    if source == "Cloudformation": # Cloudformation => create schema
        return create_schema()
    elif source == "EventBridge": # Event Bridge => image labels
        image_id = event["detail"]["image_id"]
        labels = event["detail"]["labels"]
        response = insert_new_image(image_id, labels)
        return response
    elif source == "API": #API Gateway => search
        if "language" in event:
            response = search_label(event["label"], event["country"], event["language"])
        else:
            response = search_label(event["label"])

        return response