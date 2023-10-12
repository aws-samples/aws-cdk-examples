from langchain.agents.tools import Tool

class Tools():
    def __init__(self) -> None:
        self.tools = [
            Tool(
                name="Hello World Tool",
                func=lambda x: "Hello world",
                description="useful for a simple hello world"
            )
        ]

tools = Tools().tools
