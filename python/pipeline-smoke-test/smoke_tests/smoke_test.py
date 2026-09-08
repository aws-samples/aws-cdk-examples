#!/usr/bin/env python3
"""Smoke test for the freshly deployed Widget API.

Run by the pipeline as a post-deployment step. Reads two environment
variables that CDK Pipelines populates from the deployed stack's outputs:

    API_URL              the endpoint that was just deployed
    SMOKE_TEST_ROLE_ARN  the role deployed alongside it

The API method requires IAM authentication, so this script assumes that role
and signs its request with the temporary credentials. Exiting non-zero fails
the pipeline stage.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# How many times to retry before declaring the deployment bad. A brand-new API
# Gateway stage can take a moment to start serving, and a fresh role can take a
# moment to propagate through IAM, so a single failed call is not yet evidence
# of a broken deployment.
MAX_ATTEMPTS = 5
RETRY_DELAY_SECONDS = 5


def assume_smoke_test_role(role_arn: str):
    """Assume the role the deployment created and return signing credentials."""
    sts = boto3.client("sts")
    response = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName="pipeline-smoke-test",
        # The test needs a few seconds; do not hold credentials longer.
        DurationSeconds=900,
    )
    credentials = response["Credentials"]
    return boto3.Session(
        aws_access_key_id=credentials["AccessKeyId"],
        aws_secret_access_key=credentials["SecretAccessKey"],
        aws_session_token=credentials["SessionToken"],
    )


def signed_get(session, url: str) -> tuple[int, str]:
    """GET `url`, SigV4-signed with the assumed role's credentials."""
    region = session.region_name or os.environ["AWS_REGION"]
    request = AWSRequest(method="GET", url=url)
    SigV4Auth(session.get_credentials(), "execute-api", region).add_auth(request)

    urllib_request = urllib.request.Request(
        url, method="GET", headers=dict(request.headers)
    )
    try:
        with urllib.request.urlopen(urllib_request, timeout=10) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        # An HTTP error is a result to assert on, not a crash. 403 here means
        # the request was not accepted as authenticated.
        return error.code, error.read().decode("utf-8")


def main() -> int:
    try:
        api_url = os.environ["API_URL"]
        role_arn = os.environ["SMOKE_TEST_ROLE_ARN"]
    except KeyError as missing:
        print(f"FAIL: {missing} is not set. Expected it from the stack outputs.")
        return 1

    print(f"Smoke testing {api_url}")
    print(f"Assuming {role_arn}")
    session = assume_smoke_test_role(role_arn)

    last_failure = ""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        status, body = signed_get(session, api_url)
        print(f"attempt {attempt}/{MAX_ATTEMPTS}: HTTP {status}")

        if status == 200:
            # The endpoint answered. Now check it answered correctly -- a 200
            # carrying the wrong body is still a bad deployment.
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                last_failure = f"HTTP 200 but body was not JSON: {body!r}"
                break

            if payload.get("status") != "ok":
                last_failure = f"HTTP 200 but unexpected payload: {payload!r}"
                break

            print(f"PASS: endpoint returned {payload!r}")
            return 0

        last_failure = f"HTTP {status}: {body!r}"
        if attempt < MAX_ATTEMPTS:
            time.sleep(RETRY_DELAY_SECONDS)

    print(f"FAIL: {last_failure}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
