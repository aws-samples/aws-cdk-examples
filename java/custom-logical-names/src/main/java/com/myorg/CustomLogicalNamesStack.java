package com.myorg;

import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.sns.Topic;
import software.constructs.Construct;

public class CustomLogicalNamesStack extends BaseStack {
  public CustomLogicalNamesStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
    new Topic(this, "MyTopic");
    new Bucket(this, "MyBucket");
  }
}
