import json
import boto3

sns = boto3.client("sns")
rekognition = boto3.client("rekognition")


def lambda_handler(event, context):
    for record in event["Records"]:
        # Get the Rekognition job status and job ID from the SNS message
        sns_message = json.loads(record["Sns"]["Message"])
        rekognition_job_status = sns_message["Status"]
        rekognition_job_id = sns_message["JobId"]

        if rekognition_job_status == "SUCCEEDED":
            try:
                # Get celebrity recognition results based on the job ID
                celebrity_recognition_result = rekognition.get_celebrity_recognition(
                    JobId=rekognition_job_id
                )
                # Process celebrity recognition results
                celebrities = celebrity_recognition_result["Celebrities"]
                for celebrity in celebrities:
                    celebrity_name = celebrity["Celebrity"]["Name"]
                    confidence = celebrity["Celebrity"]["Confidence"]
                    print(
                        f"Celebrity Name: {celebrity_name}, Confidence: {confidence}%"
                    )

            except Exception as e:
                print(f"Error processing celebrity recognition results: {str(e)}")

        elif rekognition_job_status == "FAILED":
            # Handle the case where the Rekognition job failed
            print(f"Rekognition job {rekognition_job_id} failed.")

        else:
            # Handle other job status or ignore it as needed
            print(
                f"Rekognition job {rekognition_job_id} is in status: {rekognition_job_status}"
            )
