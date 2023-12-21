# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import datetime
import json
import os
import random
import time

from kafka import KafkaProducer

msk = boto3.client("kafka")

def lambda_handler(event, context):
    cluster_arn = os.environ["mskClusterArn"]
    response = msk.get_bootstrap_brokers(
        ClusterArn=cluster_arn
    )
   # print(response)
    producer = KafkaProducer(security_protocol="PLAINTEXT",
                             bootstrap_servers=response["BootstrapBrokerString"],
                             value_serializer=lambda x: x.encode("utf-8"),
                            #  api_version=(2,3,1),
                            #  api_version_auto_timeout_ms=5000,
                             )
    for _ in range(1, 100):
        data = json.dumps({
            "sensor_id": str(random.randint(1, 5)),
            "temperature": random.randint(27, 32),
            "event_time": datetime.datetime.now().isoformat()
        })
        resp = producer.send(os.environ["topicName"], value=data)
        print(resp)
        time.sleep(1)
