import cdk = require('@aws-cdk/cdk');
import sfn = require('@aws-cdk/aws-stepfunctions');

class JobPollerStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: cdk.StackProps = {}) {
        super(scope, id, props);

        const submitJobActivity = new sfn.Activity(this, 'SubmitJob');
        const checkJobActivity = new sfn.Activity(this, 'CheckJob');

        const submitJob = new sfn.Task(this, 'Submit Job', {
            resource: submitJobActivity,
            resultPath: '$.guid',
        });
        const waitX = new sfn.Wait(this, 'Wait X Seconds', { duration: sfn.WaitDuration.secondsPath('$.wait_time') });
        const getStatus = new sfn.Task(this, 'Get Job Status', {
            resource: checkJobActivity,
            inputPath: '$.guid',
            resultPath: '$.status',
        });
        const isComplete = new sfn.Choice(this, 'Job Complete?');
        const jobFailed = new sfn.Fail(this, 'Job Failed', {
            cause: 'AWS Batch Job Failed',
            error: 'DescribeJob returned FAILED',
        });
        const finalStatus = new sfn.Task(this, 'Get Final Job Status', {
            resource: checkJobActivity,
            inputPath: '$.guid',
        });

        const chain = sfn.Chain
            .start(submitJob)
            .next(waitX)
            .next(getStatus)
            .next(isComplete
                .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
                .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
                .otherwise(waitX));

        new sfn.StateMachine(this, 'StateMachine', {
            definition: chain,
            timeoutSec: 30
        });
    }
}

const app = new cdk.App();
new JobPollerStack(app, 'aws-stepfunctions-integ');
app.run();
