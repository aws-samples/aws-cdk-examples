from aws_cdk import cdk
from aws_cdk import aws_dynamodb as dynanodb


class DynamoPostsTable(cdk.Construct):
    def __init__(self, scope: cdk.Construct, id: str) -> None:
        super().__init__(scope, id)

        dynanodb.Table(
            self,
            "Table",
            partition_key={"name": "Alias", "type": dynanodb.AttributeType.String},
            sort_key={"name": "Timestamp", "type": dynanodb.AttributeType.String},
            read_capacity=5,
            write_capacity=5,
        )
