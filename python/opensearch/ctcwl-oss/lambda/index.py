"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

import base64
import boto3
import copy
from datetime import datetime
import gzip
from io import BytesIO
import json
import logging
import os
from requests_aws4auth import AWS4Auth
from opensearchpy import OpenSearch, RequestsHttpConnection


# Lambda handler
def handler(event, context):
    try:
        host = os.environ["COLLECTION_ENDPOINT"]
        if host.startswith("https://"):
            host = host[8:]
        region = os.environ["REGION"]
        service = "aoss"
        credentials = boto3.Session().get_credentials()

        awsauth = AWS4Auth(
            credentials.access_key,
            credentials.secret_key,
            region,
            service,
            session_token=credentials.token,
        )

        # Build the OpenSearch client
        os_client = OpenSearch(
            hosts=[{"host": host, "port": 443}],
            http_auth=awsauth,
            use_ssl=True,
            verify_certs=False,
            connection_class=RequestsHttpConnection,
            timeout=300,
        )

        cw_data = str(event["awslogs"]["data"])
        cw_logs = gzip.GzipFile(
            fileobj=BytesIO(base64.b64decode(cw_data, validate=True))
        ).read()
        cw_logs = json.loads(cw_logs)
        if cw_logs["messageType"] == "CONTROL_MESSAGE":
            print("Skipping control message")
            return

        parse_and_send(os_client, cw_logs)

    except Exception as e:
        logging.exception("Failed to process CloudWatch data")
        response_status = "FAILED"
        error_message = f"{response_status} Error: {str(e)}. "
        print(error_message)
    finally:
        return "Succeeded"


def parse_and_send(os_client, cw_logs):
    # OpenSearch serverless using daily index automatically
    index_name = os.environ["INDEX_NAME"]
    bulk_body = ""
    for log_event in cw_logs["logEvents"]:
        bulk_body += f'{{"index": {{"_index": "{index_name}"}} }}\n'
        fields = transform(events_md(cw_logs), log_event)
        bulk_body += f"{json.dumps(fields)}\n"
    print(f"Sending {len(bulk_body)} characters to OpenSearch")
    res = os_client.bulk(body=bulk_body)
    print(f"Errors {res['errors']}, Took: {res['took']}")


def events_md(log_events):
    ret = {}
    ret["@owner"] = log_events["owner"]
    ret["@log_group"] = log_events["logGroup"]
    ret["@log_stream"] = log_events["logStream"]
    return ret


def transform(md, log_event):
    ret = copy.deepcopy(md)
    ret["@id"] = log_event["id"]
    ret["@timestamp"] = datetime.fromtimestamp(
        log_event["timestamp"] / 1000
    ).isoformat()
    ret["@message"] = log_event["message"]
    fields = json.loads(log_event["message"])
    for key, value in fields.items():
        ret[key] = int(value) if isNumber(value) else value
    return ret


def isNumber(x):
    try:
        return bool(0 == x * 0)
    except:
        return False
