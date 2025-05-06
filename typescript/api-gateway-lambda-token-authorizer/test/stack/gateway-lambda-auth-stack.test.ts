import { App } from "aws-cdk-lib";
import { GatewayLambdaAuth } from "../../lib/stack/gateway-lambda-auth-stack";
import { Template } from "aws-cdk-lib/assertions";
import { normalizeTemplate } from "../../../test-utils/normalize-template";

describe('Snapshot', () => {

    it('Stack', () => {
        const app = new App();
        const stack = new GatewayLambdaAuth(app, 'test-api-gateway-lambda-auth');
        const template = Template.fromStack(stack);
        // Normalize the template before snapshot comparison
        const normalizedTemplate = normalizeTemplate(template.toJSON());
        expect(normalizedTemplate).toMatchSnapshot();
    });

})

