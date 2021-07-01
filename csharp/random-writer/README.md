# RandomWriter

## Overview
This sample application demonstrates some essential mechanisms of the *AWS Cloud
Development Kit* (*AWS CDK*) for .NET (in this case, using **C#**):
- Creating a user-defined *construct*
- Having this *construct* implement a feature interface
  (`Amazon.CDK.AWS.Events.IRuleTarget`) to bring specific capabilities to the
  *construct*
- Granting permissions (for a *Lambda* function to write into a *DynamoDB*
  table) using the `.Grant*` methods.

## Application Resources
> All resources provisioned by this application are *[free-tier] eligible* or
> generally free to provision and use.

The application provisions the following elements (shown in their hierarchical
presentation withing the *CDK construct tree*):

- A *stack* named `RandomWriterStack`
  - A user-defined *construct* named `RandomWriter`
    - A *DynamoDB* table (the physical name of which is to be determined by
      *AWS CloudFormation* upon creation)
    - A *Lambda* function
      * It writes a random hash into the *DynamoDB* table when invoked
  - A *CloudWatch* event rule that triggers an execution of the *Lambda*
    function *every minute*.

[free-tier]: https://aws.amazon.com/free/
