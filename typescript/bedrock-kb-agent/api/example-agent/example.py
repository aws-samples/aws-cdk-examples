"""
Copyright 2023 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import BedrockAgentResolver
from aws_lambda_powertools.utilities.data_masking import DataMasking
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler.openapi.params import Body, Query
import json
import sys
from typing import Annotated
import random

tracer = Tracer()
logger = Logger()
data_masker = DataMasking()
app = BedrockAgentResolver()


@app.get(
  "/weather",
  description="Provides the weather forecast for a given location",
)
@tracer.capture_method
def describe_scrap(
  location: Annotated[
    str,
    Query(description="The location form where the weather will be forecasted."),
  ]
) -> Annotated[str, Body(description="The weather forecast for a given location")]:
  weather = "rainy" if bool(random.getrandbits(1)) else "sunny"
  return f"The weather in {location} is {weather}"


@logger.inject_lambda_context
@tracer.capture_lambda_handler
@tracer.capture_method
def lambda_handler(event: dict, context: LambdaContext):
    logger.info(event)
    return app.resolve(event, context)


if __name__ == "__main__":
    openapi_file = "openapi.json"
    with open(openapi_file, "w") as f:
        f.write(app.get_openapi_json_schema())
        print(f"\n\n{openapi_file} was generated.\n\n")
