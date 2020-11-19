using System;
using System.Collections.Generic;
using System.Text;
using Amazon.CDK;
using Amazon.CDK.AWS.IAM;

namespace EksClusterWithPrometheusGrafana
{
    public class IAMStack : Stack
    {
        public string EKSAdminRoleARN { get; private set; }
        public string EKSNodeRoleARN { get; private set; }

        internal IAMStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            var clusterAdmin = new Role(this, Constants.EKS_CLUSTER_ADMIN_ROLE, new RoleProps
            {
                RoleName = Constants.EKS_CLUSTER_ADMIN_ROLE,
                AssumedBy = new ServicePrincipal(Constants.IAM_SERVICE_PRINCIPAL_EKS)
            });
            clusterAdmin.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName(Constants.IAM_POLICY_EKS_CLUSTER));
            if (!string.IsNullOrEmpty(Constants.IAM_USER_AWSCLI_ARN))
            {
                // Add AssumeRole permission to the AWS CLI user for the EKSCluster admin role
                var policyForAWSCLIUser = new PolicyStatement();
                policyForAWSCLIUser.Effect = Effect.ALLOW;
                policyForAWSCLIUser.AddArnPrincipal(Constants.IAM_USER_AWSCLI_ARN);
                policyForAWSCLIUser.AddActions(Constants.IAM_POLICY_ACTION_ASSUMEROLE);
                clusterAdmin.AssumeRolePolicy.AddStatements(policyForAWSCLIUser);
            }

            var nodeRole = new Role(this, Constants.EKS_NODE_ROLE_ID, new RoleProps
            {
                RoleName = Constants.EKS_NODE_ROLE_ID,
                AssumedBy = new ServicePrincipal(Constants.IAM_SERVICE_PRINCIPAL_EC2)
            });
            nodeRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName(Constants.IAM_POLICY_EKS_WORKER_NODE));
            nodeRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName(Constants.IAM_POLICY_EC2_ECR_READONLY));
            nodeRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName(Constants.IAM_POLICY_EKS_CNI));
            
            this.EKSAdminRoleARN = clusterAdmin.RoleArn;
            new CfnOutput(this, "EKSAdminRoleARN", new CfnOutputProps
            {
                Value = this.EKSAdminRoleARN
            });

            this.EKSNodeRoleARN = nodeRole.RoleArn;
            new CfnOutput(this, "EKSNodeRoleARN", new CfnOutputProps
            {
                Value = this.EKSNodeRoleARN
            });
        }
    }
}
