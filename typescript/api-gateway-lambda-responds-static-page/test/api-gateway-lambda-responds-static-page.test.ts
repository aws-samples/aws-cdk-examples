import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkSampleStack } from '../bin/cdk-sample';

describe('CdkSampleStack', () => {
    test('DynamoDB Table Created with Correct Configuration', () => {
        const app = new App();
        const stack = new CdkSampleStack(app, 'TestStack');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::DynamoDB::Table', {
            KeySchema: [{
                AttributeName: 'id',
                KeyType: 'HASH'
            }],
            AttributeDefinitions: [{
                AttributeName: 'id',
                AttributeType: 'S'
            }]
        });
    });
});
