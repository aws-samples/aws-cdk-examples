using Amazon.CDK;
using Amazon.CDK.AWS.StepFunctions;
using Amazon.CDK.AWS.StepFunctions.Tasks;
using Constructs;

namespace StepfunctionsJobPoller
{
    public class StepfunctionsJobPollerStack : Stack
    {
        public StepfunctionsJobPollerStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var submitJobActivity = new Activity(this, "SubmitJob");
            var checkJobActivity = new Activity(this, "CheckJob");

            var submitJob = new StepFunctionsInvokeActivity(this, "Submit Job", new StepFunctionsInvokeActivityProps
            {
                Activity = submitJobActivity,
                ResultPath = "$.guid"
            });

            var waitX = new Wait(this, "Wait X Seconds", new WaitProps
            {
                Time = WaitTime.SecondsPath("$.wait_time")
            });

            var getStatus = new StepFunctionsInvokeActivity(this, "Get Job Status", new StepFunctionsInvokeActivityProps
            {
                Activity = checkJobActivity,
                InputPath = "$.guid",
                ResultPath = "$.status"
            });

            var isComplete = new Choice(this, "Job Complete?");

            var jobFailed = new Fail(this, "Job Failed", new FailProps
            {
                Cause = "AWS Batch Job Failed",
                Error = "DescribeJob returned FAILED"
            });

            var finalStatus = new StepFunctionsInvokeActivity(this, "Get Final Job Status", new StepFunctionsInvokeActivityProps
            {
                Activity = checkJobActivity,
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

            new StateMachine(this, "StateMachine", new StateMachineProps
            {
                Definition = chain,
                Timeout = Duration.Seconds(30)
            });
        }
    }
}
