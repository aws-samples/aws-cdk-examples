import * as AWS from 'aws-sdk';

const client = new AWS.Rekognition();
export const handler = async (event: any = {}): Promise<any> => {
    console.log(event.Records[0].s3.object.key);

    const params: AWS.Rekognition.DetectLabelsRequest = {
        Image: {
            S3Object: {
                Bucket: process.env.BUCKET_NAME,
                Name: event.Records[0].s3.object.key
            },
        },
        MaxLabels: 10,
        MinConfidence: 70
    };

    const response = await client.detectLabels(params).promise();
    const labels = response.Labels || [];
    console.log(labels);

    // Write to DDB

    return;
};
