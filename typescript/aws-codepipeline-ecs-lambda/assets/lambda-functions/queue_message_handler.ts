import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';

export const handler = (event: SQSEvent): SQSBatchResponse | void => {
    if (event) {
        const batchItemFailures: SQSBatchItemFailure[] = [];
        event?.Records.forEach(record => {
            try {
                // process record
            } catch (err) {
                batchItemFailures.push({
                    itemIdentifier: record.messageId
                });
            }
        });

        return { batchItemFailures };
    }
};
