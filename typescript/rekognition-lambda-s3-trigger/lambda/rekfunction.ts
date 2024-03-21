import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DetectLabelsCommandInput, Rekognition } from '@aws-sdk/client-rekognition';

const client = new Rekognition();
export const handler = async (event: any = {}): Promise<any> => {
    const key = event.Records[0].s3.object.key
    console.log(key);

    const params: DetectLabelsCommandInput = {
        Image: {
            S3Object: {
                Bucket: process.env.BUCKET_NAME,
                Name: key
            },
        },
        MaxLabels: 10,
        MinConfidence: 70
    };

    const response = await client.detectLabels(params);
    const labels = response.Labels || [];
    console.log(labels.map(i => i.Name).toString());

    // Write to DDB
    const tableName = process.env.TABLE_NAME || "";
    const dynamodb = new DynamoDB();

    const dynamodbParams = {
        TableName: tableName,
        Item: {
            image_name: {'S': key},
            labels: {'S': labels.map(i => i.Name).toString()}
        },
        ConditionExpression: 'attribute_not_exists(image_name)'
    };

    try {
        await dynamodb.putItem(dynamodbParams);
    }
    catch(err) {
        console.log(err);
    }
    
    return;
};
