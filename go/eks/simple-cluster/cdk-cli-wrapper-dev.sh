#!/bin/bash

# Get script location.
SHELL_PATH=$(cd "$(dirname "$0")";pwd)

CDK_CMD=$1
CDK_ACC="$(aws sts get-caller-identity --output text --query 'Account')"
CDK_REGION="$(jq -r .context.deploymentRegion ./cdk.json)"

# Check execution env.
if [ -z "$CODEBUILD_BUILD_ID" ]
then
    if [ -z "$CDK_REGION" ]; then
        CDK_REGION="$(aws configure get region)"
    fi

    echo "Run bootstrap..."
    export CDK_NEW_BOOTSTRAP=1
    npx cdk bootstrap aws://${CDK_ACC}/${CDK_REGION} --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
else
    CDK_REGION=$AWS_DEFAULT_REGION
fi

# CDK command pre-process.

# Destroy pre-process.
if [ "$CDK_CMD" == "destroy" ]; then
    # Remove PVRE hook auto-added policy before executing destroy.
    node_role_name="$(jq -r .context.stackName ./cdk.json)-$(jq -r .context.targetArch ./cdk.json)-${CDK_REGION}-ClusterNodeRole"
    policy_arn="$(aws iam list-attached-role-policies --role-name ${node_role_name} --query 'AttachedPolicies[?PolicyName==`AmazonSSMManagedInstanceCore`].PolicyArn' --output text)"

    if [ ! -z "$policy_arn" ]; then
        aws iam detach-role-policy --role-name $node_role_name --policy-arn $policy_arn
    fi
fi

# CDK command.
# Valid deploymentStage are: [DEV, PROD]
set -- "$@" "-c" "deploymentStage=DEV" "--outputs-file" "${SHELL_PATH}/cdk.out/cluster-info.json"
$SHELL_PATH/cdk-cli-wrapper.sh ${CDK_ACC} ${CDK_REGION} "$@"
cdk_exec_result=$?

# CDK command post-process.
eks_cluster_name="$(jq -r .context.clusterName ./cdk.json)-$(jq -r .context.targetArch ./cdk.json)"
init_state_file=$SHELL_PATH/cdk.out/init-state.${CDK_REGION}-${eks_cluster_name}
if [ $cdk_exec_result -eq 0 ] && [ "$CDK_CMD" == "deploy" ] && [ ! -f "$init_state_file" ]; then
    # Update kubeconfig
    echo "Update kubeconfig..."
    aws eks update-kubeconfig --region ${CDK_REGION} --name ${eks_cluster_name}

    # Add the following annotation to your service accounts to use the AWS Security Token Service AWS Regional endpoint, rather than the global endpoint.
    # If your cluster is 1.22 or later, the AWS Regional endpoint is used by default, so you don't need to annotate your Kubernetes service accounts to use it.
    echo "Update service account annotate..."
    kubectl annotate serviceaccount -n kube-system aws-node eks.amazonaws.com/sts-regional-endpoints=true
    kubectl annotate serviceaccount -n kube-system aws-load-balancer-controller eks.amazonaws.com/sts-regional-endpoints=true

    # Patch the deployment to add the cluster-autoscaler.kubernetes.io/safe-to-evict annotation.
    echo "Patch cluster autoscaler deployment..."
    kubectl patch deployment cluster-autoscaler-aws-cluster-autoscaler -n kube-system -p '{"spec":{"template":{"metadata":{"annotations":{"cluster-autoscaler.kubernetes.io/safe-to-evict": "false"}}}}}'

    # Change init state.
    if [ $? -eq 0 ]; then
        echo "Update init state..."
        echo "$(date '+%Y.%m.%d.%H%M%S' -d '+8 hours')|UTC+8" > $init_state_file
        echo "The first deployment is complete."
        echo ""
    fi
fi

# Destroy post-process.
if [ $cdk_exec_result -eq 0 ] && [ "$CDK_CMD" == "destroy" ]; then
    rm -rf $init_state_file
fi
