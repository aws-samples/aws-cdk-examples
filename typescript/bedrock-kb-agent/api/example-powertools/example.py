"""
Copyright 2024 Amazon.com, Inc. and its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

  http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
"""
import os
from typing import Optional
import boto3
import json
import traceback
from aws_lambda_powertools.utilities.parser import (
    BaseModel,
    Field,
    parse
)

from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_masking import DataMasking
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.logging import correlation_paths
import uuid

# Docs: https://docs.powertools.aws.dev/lambda/python/latest/

tracer = Tracer()
logger = Logger()
data_masker = DataMasking()
app = APIGatewayHttpResolver()
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

class Question(BaseModel):
    """Example response model"""
    conv_id: Optional[str] = Field(description="The unique id for the conversation",
                                   default=None)
    question: str = Field(description="The text of the question")


class Answer(BaseModel):
    """Example response model"""
    conv_id: str = Field(description="The unique id for the conversation ")
    question: str = Field(description="The text of the question")
    answer: str = Field(description="The text of the response")


def _ask_rag(question: str,
             conversation_id: str,
             knowledge_base_id: str):

    model_arn = "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"

    response = (
        bedrock_agent_runtime.retrieve_and_generate(
            sessionId=conversation_id,
            input={"text": "What is S3?"},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": knowledge_base_id,
                    "modelArn": model_arn,
                    "retrievalConfiguration": {
                        "vectorSearchConfiguration": {"numberOfResults": 10}
                    },
                },
            },
        )
        if conversation_id
        else bedrock_agent_runtime.retrieve_and_generate(
            input={"text": question},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": knowledge_base_id,
                    "modelArn": model_arn,
                    "retrievalConfiguration": {
                        "vectorSearchConfiguration": {"numberOfResults": 10}
                    },
                },
            },
        )
    )

    # Make the API call
    # print(f"response=\n {json.dumps(response)}")

    answer = response.get("output", {}).get("text", "Not Found")

    citations = response.get("citations", [])

    citations = [ {"generatedResponse": citation.get("generatedResponsePart", {}).get("textResponsePart", {}).get("text", ""),
                   "retrievedReferences": [{"text": reference.get("content", {}).get("text"),
                                            "location": reference.get("location",)
                                            } for reference in citation.get("retrievedReferences", [])]}
                    for citation in citations]

    print(f"citations=\n {json.dumps(citations)}")
    conversation_id = response.get("sessionId")

    return answer, citations, conversation_id


@app.post("/api/v1/example")
@tracer.capture_method
def answer_to_message() :
    """
    Function to handle the POST request
    """
    logger.info("Answer question form kb")
    question_request = parse(event=app.current_event.json_body, model=Question)

    knowledge_base_id = os.environ.get("KNOWLEDGE_BASE_ID", None)
    if knowledge_base_id is None:
        return "Server Error", 500

    try:
      rag_answer = _ask_rag(question=question_request.question,
                            conversation_id=question_request.conv_id,
                            knowledge_base_id="AWXM2RSO70")

      return (Answer(conv_id=rag_answer[2],
                     question=question_request.question,
                     answer=rag_answer[0]),
              200)
    except Exception as ex:
        logger.error(traceback.format_exc())
        return "Server Error", 500


@app.post("/api/v1/weather")
@tracer.capture_method
def get_weather() :
  """
  Function to handle the POST request
  """
  logger.info("Get weather form the agent")

  aget_id = os.environ.get("AGENT_ID")
  if not aget_id:
    raise ValueError("AGENT_ID environment variable is not set")

  aget_alias_id = os.environ.get("AGENT_ALIAS_ID")
  if not aget_alias_id:
    raise ValueError("AGENT_ALIAS_ID environment variable is not set")

  question_request = parse(event=app.current_event.json_body, model=Question)

  conv_id = question_request.conv_id
  if not conv_id:
    conv_id = uuid.uuid4().hex


  agent_response = bedrock_agent_runtime.invoke_agent(
    agentId=aget_id,
    agentAliasId=aget_alias_id,
    sessionId=conv_id,
    inputText=question_request.question,
    enableTrace=True)

  traces = []
  chunks = []
  for event in agent_response.get("completion"):
    if "trace" in event:
      traces.append(event["trace"])
    if "chunk" in event:
      chunks.append(event["chunk"]["bytes"].decode())

  answer = "".join(chunks)
  return Answer(conv_id=conv_id,
                question=question_request.question,
                answer=answer) ,200


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext):
    """
    Lambda handler entry point
    """
    # remove sensitive information from the event before writing to CloudWatch
    # logger.info(
    #     data_masker.erase(
    #         event,
    #         fields=[
    #             "headers.authorization",
    #         ],
    #     )
    # )
    logger.info(event)
    return app.resolve(event, context)


if __name__ == "__main__":
    # event = {
    #     "version": "2.0",
    #     "routeKey": "POST /api/v1/example",
    #     "rawPath": "/api/v1/example",
    #     "rawQueryString": "",
    #     "headers": {
    #         "accept-encoding": "gzip",
    #         "authorization": "AAA",
    #     },
    #     "requestContext": {
    #         "authorizer": {},
    #         "http": {
    #             "method": "POST",
    #             "path": "/api/v1/example",
    #             "protocol": "HTTP/1.1",
    #         },
    #         "routeKey": "POST /api/v1/example",
    #         "stage": "$default",
    #     },
    #   "body": "{\"question\":\"what is S3?\"}",
    # }

    event = {
        "version": "2.0",
        "routeKey": "POST /api/v1/weather",
        "rawPath": "/api/v1/weather",
        "rawQueryString": "",
        "headers": {
            "accept-encoding": "gzip",
            "authorization": "AAA",
        },
        "requestContext": {
            "authorizer": {},
            "http": {
                "method": "POST",
                "path": "/api/v1/weather",
                "protocol": "HTTP/1.1",
            },
            "routeKey": "POST /api/v1/weather",
            "stage": "$default",
        },
      "body": "{\"question\":\"How is the weather in London?\"}",
    }

    class MockContext:
        def __init__(self):
            self.function_name = "test_function"
            self.memory_limit_in_mb = 128
            self.invoked_function_arn = (
                "arn:aws:lambda:us-east-1:123456789012:function:test_function"
            )
            self.aws_request_id = "test_request_id"

    context = MockContext()

    response = lambda_handler(event, context)
    print(json.dumps(response))
