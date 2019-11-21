using Amazon.CDK;
using Amazon.CDK.AWS.StepFunctions;
using Amazon.CDK.AWS.StepFunctions.Tasks;

namespace StepfunctionsJobPoller
{
    public class StepfunctionsJobPollerStack : Stack
    {
        public StepfunctionsJobPollerStack(Construct parent, string id, IStackProps props) : base(parent, id, props)
        {
            var submitJobActivity = new Activity(this, "SubmitJob", new ActivityProps());
            var checkJobActivity = new Activity(this, "CheckJob", new ActivityProps());
            var submitJob = new Task(this, "Submit Job", new TaskProps {
                Task = new InvokeActivity(submitJobActivity),
                ResultPath= "$.guid"
            });

            var waitX = new Wait(this, "Wait X Seconds", new WaitProps {
                Time = WaitTime.SecondsPath("$.wait_time")
            });

            var getStatus = new Task(this, "Get Job Status", new TaskProps{
                Task = new InvokeActivity(checkJobActivity),
                InputPath = "$.guid",
                ResultPath = "$.status"
            });

            var isComplete = new Choice(this, "Job Complete?", new ChoiceProps());

            var jobFailed = new Fail(this, "Job Failed", new FailProps {
                Cause = "AWS Batch Job Failed",
                Error = "DescribeJob returned FAILED"
            });

            var finalStatus = new Task(this, "Get Final Job Status", new TaskProps {
                Task = new InvokeActivity(checkJobActivity),
                InputPath = "$.guid"
            });

            var chain = Chain
              .Start(submitJob)
              .Next(waitX)
              .Next(getStatus)
              .Next(isComplete
                .When(Condition.StringEquals("$.status", "FAILED"), jobFailed)
                .When(Condition.StringEquals("$.status", "SUCCEEDED"), finalStatus)
                .Otherwise(waitX));
            
            new StateMachine(this, "StateMachine", new StateMachineProps {
                Definition = chain,
                Timeout = Duration.Seconds(30)
            });
        }
    }
}
