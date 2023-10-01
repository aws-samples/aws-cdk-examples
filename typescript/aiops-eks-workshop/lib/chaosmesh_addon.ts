// lib/chaosmesh_addon.ts
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { setPath } from '@aws-quickstart/eks-blueprints/dist/utils/object-utils';

/**
 * User provided options for the Helm Chart
 */
export interface ChaosMeshAddOnProps extends blueprints.HelmAddOnUserProps {
  version?: string,
  ingressEnabled?: boolean,
  chaosmeshServiceType?: string,
  chaosmeshDashboardListenPort?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: blueprints.HelmAddOnProps & ChaosMeshAddOnProps = {
  name: "chaos-mesh",
  namespace: "chaos-testing",
  chart: "chaos-mesh",
  version: "2.4.1",
  release: "chaos-mesh",
  repository:  "https://charts.chaos-mesh.org",
  values: {},

  ingressEnabled: true,
  chaosmeshServiceType: "LoadBalancer",
  chaosmeshDashboardListenPort: "80"
};

/**
 * Main class to instantiate the Helm chart
 */
export class ChaosMeshAddOn extends blueprints.HelmAddOn {

  readonly options: ChaosMeshAddOnProps;

  constructor(props?: ChaosMeshAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as ChaosMeshAddOnProps;
  }

  deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
    let values: blueprints.Values = populateValues(this.options);
    const chart = this.addHelmChart(clusterInfo, values);

    return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: ChaosMeshAddOnProps): blueprints.Values {
  const values = helmOptions.values ?? {};

  setPath(values, "ingress.enabled",  helmOptions.ingressEnabled);
  setPath(values, "dashboard.service.type",  helmOptions.chaosmeshServiceType);
  setPath(values, "dashboard.env.LISTEN_PORT", helmOptions.chaosmeshDashboardListenPort);
  setPath(values, "mysql.generate_passwords",  true);

  return values;
}
