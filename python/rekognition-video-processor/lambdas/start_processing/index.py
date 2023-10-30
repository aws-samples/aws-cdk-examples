import boto3
import os

rekognition = boto3.client("rekognition")
s3 = boto3.client("s3")

SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]
SNS_ROLE_ARN = os.environ["SNS_ROLE_ARN"]


def lambda_handler(event, context):
    key = event["Records"][0]["s3"]["object"]["key"]
    bucket_name = event["Records"][0]["s3"]["bucket"]["name"]
    file_extension = os.path.splitext(key)[1]

    if file_extension == ".mp4":
        response = rekognition.start_celebrity_recognition(
            Video={"S3Object": {"Bucket": bucket_name, "Name": key}},
            NotificationChannel={
                "SNSTopicArn": SNS_TOPIC_ARN,
                "RoleArn": SNS_ROLE_ARN,
            },
        )
        recognition = rekognition.get_celebrity_recognition(JobId=response["JobId"])
    
        return {"statusCode": 200, "body": "Rekognition job started!"}
    
    return {"statusCode": 200, "body": "No video uploaded"}
 
