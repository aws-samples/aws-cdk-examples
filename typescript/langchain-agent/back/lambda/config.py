from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Config:
    CONVERSATION_TABLE_NAME = os.environ['CONVERSATION_TABLE_NAME']
    OPENAI_API_KEY_SSM_PARAMETER_NAME = os.environ['OPENAI_API_KEY_SSM_PARAMETER_NAME']


config = Config()
