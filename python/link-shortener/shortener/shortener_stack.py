from aws_cdk import (core)

from .shortener_construct import ShortenerConstruct


class MyStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        shortener = ShortenerConstruct(self, "MyHelloConstruct")
