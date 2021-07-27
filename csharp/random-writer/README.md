# RandomWriter

## Overview

This sample application demonstrates some essential mechanisms of the _AWS Cloud
Development Kit_ (_AWS CDK_) for .NET (in this case, using **C#**):

- Creating a user-defined _construct_
- Having this _construct_ implement a feature interface
  (`Amazon.CDK.AWS.Events.IRuleTarget`) to bring specific capabilities to the
  _construct_
- Granting permissions (for a _Lambda_ function to write into a _DynamoDB_
  table) using the `.Grant*` methods.

## Application Resources

> All resources provisioned by this application are _[free-tier] eligible_ or
> generally free to provision and use.

The application provisions the following elements (shown in their hierarchical
presentation withing the _CDK construct tree_):

- A _stack_ named `RandomWriterStack`
  - A user-defined _construct_ named `RandomWriter`
    - A _DynamoDB_ table (the physical name of which is to be determined by
      _AWS CloudFormation_ upon creation)
    - A _Lambda_ function
      - It writes a random hash into the _DynamoDB_ table when invoked
  - A _CloudWatch_ event rule that triggers an execution of the _Lambda_
    function _every minute_.

[free-tier]: https://aws.amazon.com/free/
