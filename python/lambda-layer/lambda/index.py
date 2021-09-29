import common  # layer/python/common.py is in the path


def handler(event, context):
    """
    Lambda function handler
    """
    print("Lambda running")
    print(common.layer_function())
