
# ColorTeller App, ECS Fargate, ALB and AppMesh

This is a port of the work in https://github.com/aws/aws-app-mesh-examples/tree/master/examples/apps/colorapp/ecs

This creates:
  * VPC
  * ECS Cluster
  * Fargate Tasks for the ColorTeller App
  * Service Discovery
  * ALB
  * AppMesh

Source for colorteller containers is from aws-app-mesh-examples.

VPC endpoints can be expensive and we create one in the network stack.