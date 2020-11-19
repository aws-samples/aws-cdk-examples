using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace EksClusterWithPrometheusGrafana
{
    sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            var iamStack = new IAMStack(app, "IAMStack");
            var vpcStack = new VPCStack(app, "VPCStack");
            var eksClusterStack = new EksClusterWithPrometheusGrafanaStack(app, "EksClusterWithPrometheusGrafanaStack", vpcStack.VPC, iamStack.EKSAdminRoleARN, iamStack.EKSNodeRoleARN);
            eksClusterStack.AddDependency(iamStack);
            eksClusterStack.AddDependency(vpcStack);
            app.Synth();
        }
    }
}
