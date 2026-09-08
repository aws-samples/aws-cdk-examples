"""Neptune Streams -> OpenSearch Serverless poller.

Neptune Streams has no Lambda event-source mapping, so this function polls the
stream API, writes what it reads to an OpenSearch Serverless collection, and
records how far it got in DynamoDB.

Both calls are SigV4 signed, with different service names:

  * Neptune stream reads  -> service "neptune-db" (IAM auth is required when the
    target is OpenSearch Serverless, so this is never optional here)
  * OpenSearch writes     -> service "aoss" (NOT "es"; the managed-domain
    signing name is rejected by a collection)

Three properties keep replication correct:

  * ONE WRITER. The function is deployed with reserved concurrency of 1 and a
    schedule longer than its own timeout, so two pollers cannot run at once.
    The stream is unsharded and strictly ordered, so a second writer would
    interleave batches and rewind the checkpoint.
  * COMPARE-AND-SWAP CHECKPOINTS. The position is only committed if it has not
    moved since it was read, so a concurrent writer is detected instead of
    silently overwriting progress.
  * COMMIT AFTER WRITE. The checkpoint advances only after OpenSearch accepts
    the batch, making delivery at-least-once. Writes are upserts and deletes by
    document id, so replaying a batch is harmless.

The document shape follows the Neptune data model for OpenSearch data, so
Neptune's own full-text-search calls can read what this writes.
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.httpsession import URLLib3Session

LOG = logging.getLogger()
LOG.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

STREAM_ENDPOINT = os.environ["NEPTUNE_STREAM_ENDPOINT"]
COLLECTION_ENDPOINT = os.environ["COLLECTION_ENDPOINT"]
CHECKPOINT_TABLE = os.environ["CHECKPOINT_TABLE"]
INDEX_NAME = os.environ.get("INDEX_NAME", "amazon_neptune")
REGION = os.environ["AWS_REGION"]
MAX_RECORDS = int(os.environ.get("MAX_RECORDS", "100"))
# "All" replicates nodes and edges; "Nodes" replicates nodes only.
REPLICATION_SCOPE = os.environ.get("REPLICATION_SCOPE", "All")

CHECKPOINT_KEY = "neptune-stream-position"

# Neptune documents ThrottlingException and MemoryLimitExceededException as
# retryable, both returned as 500.
RETRY_ATTEMPTS = int(os.environ.get("RETRY_ATTEMPTS", "4"))
RETRY_BASE_SECONDS = float(os.environ.get("RETRY_BASE_SECONDS", "0.5"))

# Leave this share of the invocation budget for the final checkpoint write, so
# Lambda does not terminate us between indexing a batch and recording it.
BUDGET_RESERVE = 0.1

_http = URLLib3Session(timeout=30)
_session = boto3.Session()
_credentials = _session.get_credentials()
_dynamodb = boto3.client("dynamodb", region_name=REGION)


class ExpiredCheckpointError(RuntimeError):
    """The stored position has aged out of the stream retention window.

    This needs a one-time re-sync and cannot be recovered by retrying. See the
    "Recovering from an expired checkpoint" section of the README.
    """


class ConcurrentPollerError(RuntimeError):
    """Another poller advanced the checkpoint while this one was working."""


def _signed_request(
    method: str, url: str, service: str, body: Optional[str] = None
) -> AWSRequest:
    """Build a SigV4-signed request for the given service."""
    headers = {"Content-Type": "application/json"}
    request = AWSRequest(method=method, url=url, data=body, headers=headers)
    # Credentials are resolved per call so a refreshed role credential is used
    # rather than one frozen at cold start.
    SigV4Auth(_credentials.get_frozen_credentials(), service, REGION).add_auth(request)
    return request


def _send_with_retry(
    method: str, url: str, service: str, body: Optional[str] = None
) -> Tuple[int, bytes]:
    """Send a signed request, retrying the failures AWS documents as retryable.

    The request is re-signed on every attempt: a SigV4 signature is bound to a
    timestamp, so replaying the first one would eventually fail on skew.
    """
    delay = RETRY_BASE_SECONDS
    last: Tuple[int, bytes] = (0, b"")

    for attempt in range(1, RETRY_ATTEMPTS + 1):
        request = _signed_request(method, url, service, body=body)
        response = _http.send(request.prepare())
        status, payload = response.status_code, response.content
        last = (status, payload)

        # 5xx covers Neptune's retryable ThrottlingException and
        # MemoryLimitExceededException, and transient OpenSearch failures.
        if status < 500:
            return status, payload

        if attempt == RETRY_ATTEMPTS:
            break

        LOG.warning(
            "%s %s returned %d, retrying in %.1fs (attempt %d/%d)",
            method,
            service,
            status,
            delay,
            attempt,
            RETRY_ATTEMPTS,
        )
        time.sleep(delay)
        delay *= 2

    return last


def _error_code(payload: bytes) -> str:
    """Pull Neptune's error code out of a failure body, if it has one."""
    try:
        return str(json.loads(payload).get("code", ""))
    except (ValueError, AttributeError):
        return ""


def _read_checkpoint() -> Optional[str]:
    """Return the last committed stream position, or None on a first run."""
    result = _dynamodb.get_item(
        TableName=CHECKPOINT_TABLE,
        Key={"pk": {"S": CHECKPOINT_KEY}},
        # A stale read would replay a batch that was already committed.
        ConsistentRead=True,
    )
    item = result.get("Item")
    if not item:
        LOG.info("No checkpoint found; starting from the oldest stream record")
        return None
    return item["position"]["S"]


def _write_checkpoint(position: str, expected: Optional[str]) -> None:
    """Advance the checkpoint only if nobody else moved it.

    Optimistic concurrency control: the write is conditional on the stored
    position still being the one this invocation read. A concurrent poller then
    fails loudly instead of silently overwriting the marker.
    """
    if expected is None:
        condition = "attribute_not_exists(pk)"
        values: Dict[str, Any] = {}
    else:
        condition = "attribute_not_exists(pk) OR #p = :expected"
        values = {":expected": {"S": expected}}

    try:
        _dynamodb.put_item(
            TableName=CHECKPOINT_TABLE,
            Item={"pk": {"S": CHECKPOINT_KEY}, "position": {"S": position}},
            ConditionExpression=condition,
            ExpressionAttributeNames={"#p": "position"},
            ExpressionAttributeValues=values or None,
        )
    except _dynamodb.exceptions.ConditionalCheckFailedException as exc:
        raise ConcurrentPollerError(
            "checkpoint moved while this poller was working; another poller is "
            "running. Reserved concurrency should make this impossible."
        ) from exc


def _fetch_stream(position: Optional[str]) -> Dict[str, Any]:
    """Read one batch of change records after `position`."""
    if position is None:
        # TRIM_HORIZON is the documented way to start at the oldest unexpired
        # record. Starting AFTER "0:0" would skip the first record.
        query = "iteratorType=TRIM_HORIZON"
    else:
        commit_num, op_num = position.split(":")
        # AFTER, not AT: the stored position is the last record already
        # processed, so AT would re-read it on every poll.
        query = (
            f"iteratorType=AFTER_SEQUENCE_NUMBER"
            f"&commitNum={commit_num}&opNum={op_num}"
        )

    url = f"{STREAM_ENDPOINT}?{query}&limit={MAX_RECORDS}"
    status, payload = _send_with_retry("GET", url, "neptune-db")

    if status == 404:
        # StreamRecordsNotFoundException: nothing past the checkpoint yet. This
        # is the normal idle case, not an error.
        LOG.info("Stream has no new records")
        return {"records": []}

    if status == 400 and _error_code(payload) == "ExpiredStreamException":
        raise ExpiredCheckpointError(
            "the stored checkpoint has aged out of the Neptune stream retention "
            "window; a one-time re-sync is required (see the README)"
        )

    if status != 200:
        raise RuntimeError(f"Neptune stream read failed: {status} {payload[:512]!r}")

    return json.loads(payload)


def _to_documents(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], str]:
    """Convert Neptune change records into OpenSearch bulk actions.

    Returns the actions plus the position of the last record consumed, so the
    checkpoint only advances over records that were actually converted.
    """
    actions: List[Dict[str, Any]] = []
    last_position = ""

    for record in records:
        event_id = record["eventId"]
        last_position = f"{event_id['commitNum']}:{event_id['opNum']}"
        data = record["data"]
        entity_type = data.get("type")

        if REPLICATION_SCOPE == "Nodes" and entity_type != "vl":
            continue

        doc_id = data["id"]
        operation = record["op"]

        if operation == "REMOVE":
            actions.append({"action": {"delete": {"_id": doc_id}}, "doc": None})
            continue

        # The Neptune data model nests properties under "predicates", keyed by
        # property name, with each value carrying its own type.
        key = data["key"]
        value = data["value"]["value"]
        actions.append(
            {
                "action": {"update": {"_id": doc_id}},
                "doc": {
                    "doc": {
                        "entity_id": doc_id,
                        "entity_type": [entity_type],
                        "predicates": {key: [{"value": value}]},
                    },
                    "doc_as_upsert": True,
                },
            }
        )

    return actions, last_position


def _bulk_index(actions: List[Dict[str, Any]]) -> None:
    """Send one _bulk request to the collection, signed for aoss."""
    lines: List[str] = []
    for entry in actions:
        lines.append(json.dumps(entry["action"]))
        if entry["doc"] is not None:
            lines.append(json.dumps(entry["doc"]))
    body = "\n".join(lines) + "\n"

    url = f"{COLLECTION_ENDPOINT}/{INDEX_NAME}/_bulk"
    status, payload = _send_with_retry("POST", url, "aoss", body=body)

    if status >= 300:
        raise RuntimeError(f"OpenSearch bulk write failed: {status} {payload[:512]!r}")

    result = json.loads(payload)
    if result.get("errors"):
        # Surface the first real failure rather than silently advancing the
        # checkpoint past records that were never indexed.
        failed = [
            item
            for item in result.get("items", [])
            if next(iter(item.values())).get("error")
        ]
        raise RuntimeError(f"OpenSearch rejected {len(failed)} document(s): {failed[:3]}")


def handler(event: Any, context: Any) -> Dict[str, Any]:
    """Drain the stream for as long as this invocation safely can.

    Draining in a loop rather than taking one batch per invocation is what keeps
    throughput usable on a schedule long enough to guarantee a single writer.
    """
    floor_ms = context.get_remaining_time_in_millis() * BUDGET_RESERVE

    position = _read_checkpoint()
    start_position = position
    records_read = 0
    batches = 0

    while context.get_remaining_time_in_millis() > floor_ms:
        payload = _fetch_stream(position)
        records = payload.get("records", [])
        if not records:
            break

        actions, last_position = _to_documents(records)
        if actions:
            _bulk_index(actions)

        # Commit per batch, so a timeout costs at most one batch of progress.
        if last_position:
            _write_checkpoint(last_position, expected=position)
            position = last_position

        records_read += len(records)
        batches += 1

        # A short batch means the stream is caught up; stop rather than spin.
        if len(records) < MAX_RECORDS:
            break

    LOG.info(
        "Read %d record(s) in %d batch(es); checkpoint %s -> %s",
        records_read,
        batches,
        start_position,
        position,
    )
    return {
        "recordsRead": records_read,
        "batches": batches,
        "position": position,
    }
