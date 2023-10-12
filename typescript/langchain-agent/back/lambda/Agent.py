from langchain.agents.tools import Tool
from langchain.agents.conversational.base import ConversationalAgent
from langchain.agents import AgentExecutor
from tools import tools
from datetime import datetime


class Agent():
    def __init__(self, llm, memory) -> None:
        self.prefix = "The following is a conversation between you, Agent, and a user. By the way, the date is " + \
            datetime.now().strftime("%m/%d/%Y, %H:%M:%S") + "."
        self.ai_prefix = "Agent"
        self.human_prefix = "User"
        self.llm = llm
        self.memory = memory
        self.agent = self.create_agent()

    def create_agent(self):
        agent = ConversationalAgent.from_llm_and_tools(
            llm=self.llm,
            tools=tools,
            prefix=self.prefix,
            ai_prefix=self.ai_prefix,
            human_prefix=self.human_prefix
        )
        agent_executor = AgentExecutor.from_agent_and_tools(
            agent=agent, tools=tools, verbose=True, memory=self.memory)
        return agent_executor

    def run(self, input):
        return self.agent.run(input=input)
