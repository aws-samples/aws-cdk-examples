import boto3
import os
from boto3.dynamodb.types import TypeSerializer
from langchain.memory.chat_message_histories import DynamoDBChatMessageHistory
from langchain.memory import ConversationBufferMemory
from config import config

from datetime import datetime
import json

now = datetime.utcnow()
dynamodb = boto3.client('dynamodb')
ts = TypeSerializer()

openai_api_key_ssm_parameter_name = config.OPENAI_API_KEY_SSM_PARAMETER_NAME
conversation_table_name = config.CONVERSATION_TABLE_NAME


class Chat():
    def __init__(self, event):
        self.set_user_identity(event)
        self.set_memory()

    def set_memory(self):
        _id = self.user_id
        self.message_history = DynamoDBChatMessageHistory(
            table_name=conversation_table_name, session_id=_id)
        self.memory = ConversationBufferMemory(
            memory_key="chat_history", chat_memory=self.message_history, return_messages=True)

    def set_user_identity(self, event):
        body = json.loads(event['body'])
        self.user_id = body['userId']


    def http_response(self, message):
        return {
            'statusCode': 200,
            'body': json.dumps(message)
        }
