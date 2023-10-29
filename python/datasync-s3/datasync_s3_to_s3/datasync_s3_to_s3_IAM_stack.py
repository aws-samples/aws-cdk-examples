import uuid
from constructs import Construct
from aws_cdk import (
    Stack,
    aws_iam as iam,
    CfnOutput
)

class DataSyncS3toS3StackIAM(Stack):
    
    # Function to create IAM Role for Datasync
    def create_datasync_roles(self, bucket_configs):
        # Create a list of bucket paths ending in /* for IAM policy
        suffix = "/*"
        i=0
        datasync_s3_roles = []

        for bc in bucket_configs:
            # Create an IAM Role for DataSync to read and write to S3 bucket
            # Create an IAM role
            
            role_name="CDKDataSyncS3Access-" + bc["bucketName"]
            s3_role = iam.Role(
                self, "CDKDataSyncS3AccessRole"+str(i),
                assumed_by=iam.ServicePrincipal("datasync.amazonaws.com"),
                description="CDK Datasync role for S3",
                role_name=role_name
            )
            
            stmt1 = iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=["s3:GetBucketLocation", "s3:ListBucket","s3:ListBucketMultipartUploads"],
                        resources=[bc["arn"]]
                        )
            
            stmt2 = iam.PolicyStatement(
                        effect=iam.Effect.ALLOW,
                        actions=["s3:AbortMultipartUpload", "s3:DeleteObject","s3:GetObject","s3:ListMultipartUploadParts","s3:PutObjectTagging","s3:GetObjectTagging","s3:PutObject"],
                        resources=[bc["arn"]+suffix]
                    )
            
            s3_policy = iam.ManagedPolicy(self,"CDKDataSyncS3Policy"+str(i), statements = [stmt1, stmt2], roles = [s3_role])

            datasync_s3_roles.append(s3_role)
            
            # Export the name using the same format as the Role name
            # This will be important by downstream Stack
            CfnOutput(self, role_name, value=s3_role.role_arn, export_name=role_name)
            
            i = i+1
        
        return datasync_s3_roles
    

    # Main function
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Store bucket configs in an array
        bucket_configs = self.node.try_get_context("S3_datasync_locations")
        if bucket_configs:
            # Add the arn to bucket_config, if it is not provided already
            for b in bucket_configs:
                if not "arn" in b:
                    b["arn"] = "arn:aws:s3:::" + b["bucketName"]
        
            self.create_datasync_roles(bucket_configs)        
        else:
            print("ERROR: Please set a context variable for S3_datasync_locations")



