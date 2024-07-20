
# Schedule scaling for ecs

This project contains code to deploy ecs cluster with the ability to scale fargate tasks based on day-night schedule.

The `cdk.json` contains context variables for schedule along with minimum and maximum capacity count for day and night schedule.

Use below command to view application auto scaling scheduled actions:
```
aws application-autoscaling describe-scheduled-actions \
    --service-namespace ecs
```

Use below command to view descriptive information about the scaling activities:
```
aws application-autoscaling describe-scaling-activities \
    --service-namespace ecs
```