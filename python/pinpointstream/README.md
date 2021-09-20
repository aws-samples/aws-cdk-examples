# Amazon Pinpoint Event Streaming

This project uses AWS CDK to create a pinpoint event streaming pipeline with Kinesis Stream, Lambda and DynamoDB.

The Amazon [Pinpoint event stream](https://docs.aws.amazon.com/pinpoint/latest/developerguide/event-streams.html) includes information about user interactions with applications (apps) that you connect to Amazon Pinpoint. It also includes information about all the messages that you send from campaigns, through any channel, and from journeys. This can also include any custom events that you've defined. Finally, it includes information about all the transactional email and SMS messages that you send.

## Setup

Create and source a Python virtualenv on MacOS and Linux, and install python dependencies:

```
$ python3 -m venv .env
$ source .env/bin/activate
$ pip install -r requirements.txt
```

## Deployment

At this point, you should be able to deploy all the stacks in this app using:

```shell
$ cdk deploy
```
On Pinpoint, add your destination phone numbers:
- Go to Pinpoint Console
- Select SMS -> Overview
- Click "Add phone number"
- You'll have to verify the number you've added

On the SendSMS Lambda function, include the destination phone number:
- Go to Lambda Console
- Select pinpointstream-SendSMSxxxxxxx
- insert the destination phone number on line 11 (phone_number = +(country code)(number))

NOTE:
- Pinpoint event payload is printed on pinpoint-ProcessStreamxxxxxx so that you can view it on the CloudWatch Log e.g. for demo purpose. Remove it if this is not desirable. 

## Clean-up

You can destroy the services created previously using:

```shell
$ cdk destroy
```

Then, remove the DynamoDB table created manually.