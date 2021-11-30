import { CfnOutput } from "aws-cdk-lib";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from 'constructs';

export interface ProxyProps {
  readonly apiName: string;
  readonly endpointType: apiGateway.EndpointType;
}

export class Proxy extends Construct {
  public readonly api: apiGateway.RestApi;

  constructor(scope: Construct, id: string, props: ProxyProps) {
    super(scope, id);

    this.api = new apiGateway.RestApi(this, "API", {
      restApiName: props.apiName,
      endpointConfiguration: {
        types: [props.endpointType]
      },
    });
  }

  public addProxy(id: string, baseUrl: string, method: string = "GET") {
    const namespace = this.api.root.addResource(id);
    const proxyResource = new apiGateway.ProxyResource(this, `ProxyResource${method}${id}`, {
      parent: namespace,
      anyMethod: false,
    });

    proxyResource.addMethod(method, new apiGateway.HttpIntegration(`${baseUrl}/{proxy}`, {
      proxy: true,
      httpMethod: method,
      options: {
        requestParameters: {
          "integration.request.path.proxy": "method.request.path.proxy"
        }
      }
    }), {
      requestParameters: {
        "method.request.path.proxy": true
      }
    });

    new CfnOutput(this, `EndPoint${method}${id}`, { value: this.api.urlForPath(proxyResource.path) });
  }
}
