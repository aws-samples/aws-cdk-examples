package software.amazon.awscdk.examples;

import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.services.stepfunctions.Activity;
import software.amazon.awscdk.services.stepfunctions.Chain;
import software.amazon.awscdk.services.stepfunctions.Choice;
import software.amazon.awscdk.services.stepfunctions.Condition;
import software.amazon.awscdk.services.stepfunctions.Fail;
import software.amazon.awscdk.services.stepfunctions.IChainable;
import software.amazon.awscdk.services.stepfunctions.StateMachine;
import software.amazon.awscdk.services.stepfunctions.Wait;
import software.amazon.awscdk.services.stepfunctions.WaitTime;
import software.amazon.awscdk.services.stepfunctions.tasks.StepFunctionsInvokeActivity;

public class StepFunctionsJobPollerStack extends Stack {

  public StepFunctionsJobPollerStack(final Construct scope, final String id) {
    super(scope, id);

    try {

      Activity submitJobActivity = Activity.Builder.create(this, "SubmitJob").build();
      Activity checkJobActivity = Activity.Builder.create(this, "CheckJob").build();

      IChainable submitJob = StepFunctionsInvokeActivity.Builder.create(this, "Submit Job")
              .activity(submitJobActivity)
              .resultPath("$.guid")
              .build();

      Wait waitX =
          Wait.Builder.create(this, "Wait X Seconds")
              .time(WaitTime.secondsPath("$.wait_time"))
              .build();

      IChainable getStatus = StepFunctionsInvokeActivity.Builder.create(this, "Get Job Status")
              .activity(checkJobActivity)
              .inputPath("$.guid")
              .resultPath("$.status")
              .build();

      Choice isComplete = Choice.Builder.create(this, "Job Complete?").build();
      Fail jobFailed =
          Fail.Builder.create(this, "Job Failed")
              .cause("AWS Batch Job Failed")
              .error("DescribeJob returned FAILED")
              .build();

      IChainable finalStatus = StepFunctionsInvokeActivity.Builder.create(this, "Get Final Job Status")
              .activity(checkJobActivity)
              .inputPath("$.guid")
              .build();

      Chain chain =
          Chain.start(submitJob)
              .next(waitX)
              .next(getStatus)
              .next(
                  isComplete
                      .when(Condition.stringEquals("$.status", "FAILED"), jobFailed)
                      .when(Condition.stringEquals("$.status", "SUCCEEDED"), finalStatus)
                      .otherwise(waitX));

      StateMachine.Builder.create(this, "StateMachine")
          .definition(chain)
          .timeout(Duration.seconds(30))
          .build();

    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
