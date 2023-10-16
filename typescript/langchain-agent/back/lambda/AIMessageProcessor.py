import json
import os
import boto3
from langchain.chat_models import ChatOpenAI
from chat import Chat
from Agent import Agent
from config import config

conversation_table_name = config.CONVERSATION_TABLE_NAME
openai_api_key_ssm_parameter_name = config.OPENAI_API_KEY_SSM_PARAMETER_NAME


def lambda_handler(event, context):
    print(event)
    chat = Chat(event)
    set_openai_api_key()
    user_message = get_user_message(event)
    llm = ChatOpenAI(temperature=0, model_name="gpt-4")
    langchain_agent = Agent(llm, chat.memory)
    message = langchain_agent.run(input=user_message)
    return chat.http_response(message)


def is_user_request_to_start_new_conversation(event):
    user_message = get_user_message(event)
    return "start a new conversation" in user_message.strip().lower()


def get_user_message(event):
    body = load_body(event)
    user_message_body = body['message']
    return user_message_body


def load_body(event):
    body = json.loads(event['body'])
    return body


def set_openai_api_key():
    ssm = boto3.client('ssm')
    response = ssm.get_parameter(Name=openai_api_key_ssm_parameter_name)
    os.environ["OPENAI_API_KEY"] = response['Parameter']['Value']
