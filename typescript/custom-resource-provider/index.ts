<<<<<<< HEAD
import cdk = require('@aws-cdk/core');
=======
import cdk = require('aws-cdk-lib');
>>>>>>> 752df6302e534a7df22a809536c588deaf444c4d
import { MyCustomResource } from './my-custom-resource';

/**
 * A stack that sets up MyCustomResource and shows how to get an attribute from it
 */
class MyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resource = new MyCustomResource(this, 'DemoResource', {
      Message: 'CustomResource says hello',
    });

    // Publish the custom resource output
    new cdk.CfnOutput(this, 'ResponseMessage', {
      description: 'The message that came back from the Custom Resource',
      value: resource.response
    });
  }
}

const app = new cdk.App();
new MyStack(app, 'CustomResourceDemoStack');
<<<<<<< HEAD
app.synth();
=======
app.synth();
>>>>>>> 752df6302e534a7df22a809536c588deaf444c4d
