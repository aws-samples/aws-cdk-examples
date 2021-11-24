package com.myorg;

import com.myorg.utils.PropertyLoader;
import java.util.ArrayList;
import java.util.List;
import software.amazon.awscdk.core.Construct;
import software.amazon.awscdk.core.Stack;
import software.amazon.awscdk.core.StackProps;
import software.amazon.awscdk.services.autoscaling.AutoScalingGroup;
import software.amazon.awscdk.services.ec2.AmazonLinuxImage;
import software.amazon.awscdk.services.ec2.InstanceClass;
import software.amazon.awscdk.services.ec2.InstanceSize;
import software.amazon.awscdk.services.ec2.InstanceType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationListener;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationListenerRule;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationLoadBalancer;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationProtocol;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationTargetGroup;
import software.amazon.awscdk.services.elasticloadbalancingv2.ApplicationTargetGroupProps;
import software.amazon.awscdk.services.elasticloadbalancingv2.ContentType;
import software.amazon.awscdk.services.elasticloadbalancingv2.FixedResponse;
import software.amazon.awscdk.services.elasticloadbalancingv2.IApplicationLoadBalancerTarget;
import software.amazon.awscdk.services.elasticloadbalancingv2.IApplicationTargetGroup;
import software.amazon.awscdk.services.elasticloadbalancingv2.TargetType;

public class ALBProjectStack extends Stack {

  public ALBProjectStack(final Construct scope, final String id) {
    this(scope, id, null);
  }

  public ALBProjectStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    // property loader
    PropertyLoader propertyLoad = new PropertyLoader();
    
    // create ALB and all anciliarry services
    Vpc vpc = Vpc.Builder.create(this, "VPC").build();
    AutoScalingGroup asg =
        AutoScalingGroup.Builder.create(this, "ASG")
            .vpc(vpc)
            .instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO))
            .userData(propertyLoad.getUserData())
            .machineImage(new AmazonLinuxImage())
            .build();

    ApplicationLoadBalancer lb =
        ApplicationLoadBalancer.Builder.create(this, "LB")
            .vpc(vpc)
            .internetFacing(Boolean.TRUE)
            .loadBalancerName("myalb")
            .build();

    List<IApplicationLoadBalancerTarget> targets = new ArrayList<IApplicationLoadBalancerTarget>();
    targets.add(asg);

    ApplicationTargetGroup webTargetGroup =
        new ApplicationTargetGroup(
            this,
            "MyTargetGroup",
            ApplicationTargetGroupProps.builder()
                .vpc(vpc)
                .targetType(TargetType.INSTANCE)
                .targets(targets)
                .port(80)
                .protocol(ApplicationProtocol.HTTP)
                .build());

    List<IApplicationTargetGroup> targetGroups = new ArrayList<IApplicationTargetGroup>();
    targetGroups.add(webTargetGroup);

    // default listener
    ApplicationListener http =
        ApplicationListener.Builder.create(this, "HTTP")
            .port(80)
            .protocol(ApplicationProtocol.HTTP)
            .open(true)
            .loadBalancer(lb)
            .defaultTargetGroups(targetGroups)
            .build();

    // adding application listern rules
    ApplicationListenerRule alrProdApi =
        ApplicationListenerRule.Builder.create(this, "prodApi")
            .pathPattern("/production")
            .priority(1)
            .listener(http)
            .hostHeader(propertyLoad.getRestAPIHostHeader())
            .build();
    
    ApplicationListenerRule alrProdM =
        ApplicationListenerRule.Builder.create(this, "prodMobile")
            .pathPattern("/production")
            .priority(2)
            .listener(http)
            .hostHeader(propertyLoad.getRestMobileHostHeader())
            .build();

    ApplicationListenerRule alrSandboxApi =
        ApplicationListenerRule.Builder.create(this, "sandboxApi")
            .pathPattern("/sandbox")
            .priority(3)
            .listener(http)
            .hostHeader(propertyLoad.getRestAPIHostHeader())
            .build();

    ApplicationListenerRule alrSandboxM =
        ApplicationListenerRule.Builder.create(this, "sandboxMobile")
            .pathPattern("/sandbox")
            .priority(4)
            .listener(http)
            .hostHeader(propertyLoad.getRestMobileHostHeader())
            .build();

    // adding fixed responses
    alrProdApi.addFixedResponse(
        FixedResponse.builder()
            .statusCode("200")
            .contentType(ContentType.APPLICATION_JSON)
            .messageBody(propertyLoad.getProdApiMessageBody())
            .build());

    alrProdM.addFixedResponse(
        FixedResponse.builder()
            .statusCode("200")
            .contentType(ContentType.APPLICATION_JSON)
            .messageBody(propertyLoad.getProdMobileMessageBody())
            .build());

    alrSandboxApi.addFixedResponse(
        FixedResponse.builder()
            .statusCode("200")
            .contentType(ContentType.APPLICATION_JSON)
            .messageBody(propertyLoad.getSandboxApiMessageBody())
            .build());

    alrSandboxM.addFixedResponse(
        FixedResponse.builder()
            .statusCode("200")
            .contentType(ContentType.APPLICATION_JSON)
            .messageBody(propertyLoad.getSandboxMobileMessageBody())
            .build());
  }
}
