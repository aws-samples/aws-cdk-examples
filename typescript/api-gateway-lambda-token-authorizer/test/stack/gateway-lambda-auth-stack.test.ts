import { App } from "aws-cdk-lib";
import { GatewayLambdaAuth } from "../../lib/stack/gateway-lambda-auth-stack";
import { Template } from "aws-cdk-lib/assertions";

describe('Snapshot', () => {

    it('Stack', () => {
        const app = new App();
        const stack = new GatewayLambdaAuth(app, 'test-api-gateway-lambda-auth');
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });

})

