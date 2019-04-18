from aws_cdk import cdk
from aws_cdk import aws_lambda as lambda_, aws_s3 as s3

from cognito_chat_room_pool import CognitoChatRoomPool
from dynamodb_posts_table import DynamoPostsTable


class ChatAppFunction(lambda_.Function):
    def __init__(
        self, scope: cdk.Construct, id: str, *, bucket: s3.IBucket, zip_file: str
    ):
        super().__init__(
            scope,
            id,
            code=lambda_.S3Code(bucket, zip_file),
            runtime=lambda_.Runtime.NODE_J_S610,
            handler="index.handler",
        )


class MyStack(cdk.Stack):
    def __init__(self, scope: cdk.App, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        DynamoPostsTable(self, "Posts")
        CognitoChatRoomPool(self, "UserPool")

        bucket = s3.Bucket.import_(self, "DougsBucket", bucket_name="dogs-chat-app")

        ChatAppFunction(
            self,
            "StartAddBucket",
            bucket=bucket,
            zip_file="StartAddingPendingCognitoUser.zip",
        )

        ChatAppFunction(
            self,
            "FinishAddBucket",
            bucket=bucket,
            zip_file="FinishAddingPendingCognitoUser.zip",
        )

        ChatAppFunction(
            self,
            "SignInUserBucket",
            bucket=bucket,
            zip_file="SignInCognitoUser.zip",
        )

        ChatAppFunction(
            self,
            "VerifyBucket",
            bucket=bucket,
            zip_file="VerifyCognitoSignIn.zip",
        )

        ChatAppFunction(
            self,
            "StartChangeBucket",
            bucket=bucket,
            zip_file="StartChangingForgottenCognitoUserPassword.zip",
        )

        ChatAppFunction(
            self,
            "FinishChangeBucket",
            bucket=bucket,
            zip_file="FinishChangingForgottenCognitoUserPassword.zip",
        )

        ChatAppFunction(
            self,
            "GetPostsBucket",
            bucket=bucket,
            zip_file="GetPosts.zip",
        )

        ChatAppFunction(
            self,
            "AddPostBucket",
            bucket=bucket,
            zip_file="AddPost.zip",
        )

        ChatAppFunction(
            self,
            "DeletePostBucket",
            bucket=bucket,
            zip_file="DeletePost.zip",
        )

        ChatAppFunction(
            self,
            "DeleteUserBucket",
            bucket=bucket,
            zip_file="DeleteCognitoUser.zip",
        )


app = cdk.App()

# Add the stack to the app
# (Apps can hot many stacks, for example, one for each region)
MyStack(app, "ChatAppStack", env={"region": "us-west-2"})

app.run()
