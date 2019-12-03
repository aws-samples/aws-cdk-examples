
# Stepfunctions Job Poller
<!--BEGIN STABILITY BANNER-->
---

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> **This is an experimental example. It may not build out of the box**
>
> This examples is built on Construct Libraries marked "Experimental" and may not be updated for latest breaking changes.
>
> If build is unsuccessful, please create an [issue](https://github.com/aws-samples/aws-cdk-examples/issues/new) so that we may debug the problem 

---
<!--END STABILITY BANNER-->

This example creates a basic Stepfunction workflow that starts a task and then listens at regular intervals for completion, then reports completion and status.

## Build

To build this app, you need to be in this example's root folder. Then run the following:
```bash
dotnet build src
cdk deploy StepfunctionsJobPollerStack
```

Enjoy!
