import uuid
from constructs import Construct
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_datasync as datasync,
    Fn,
    CfnOutput
)

class DataSyncS3toS3Stack(Stack):
    
    # Function to create Datasync Task
    def create_datasync_s3_task(self, s3_src_location, s3_dest_location):
        task = datasync.CfnTask(
            self,
            'DataSyncS3toS3Task',
            destination_location_arn=s3_src_location.attr_location_arn,
            source_location_arn=s3_dest_location.attr_location_arn)
        
        CfnOutput(self, 'task_arn', value=task.attr_task_arn)
    
        return task
    
    # Function to create a S3 bucket using CDK
    def create_bucket(self, name):
        bucket = s3.Bucket(self, name, bucket_name = name)
        return bucket
    
    # Function to get bucket ARN
    def get_bucket_arn(self, config):
        bucket_name = config["bucketName"]
        bucket_arn = ""
        
        if config["create"]:
           bucket = self.create_bucket(bucket_name)
           bucket_arn = bucket.bucket_arn
        else:
           bucket_arn = "arn:aws:s3:::" + bucket_name
        
        return bucket_arn
    
    # Function to create Datasync S3 locations
    def create_datasync_s3_locations(self, bucket_configs):
        # Create the locations
        i=0

        s3_locations_dict = {}
        for bc in bucket_configs:
            role_name_export ="CDKDataSyncS3Access-" + bc["bucketName"]
            
            location = datasync.CfnLocationS3(
                self,
                'DataSyncS3Location'+str(i),
                s3_bucket_arn=bc["arn"],
                s3_config=datasync.CfnLocationS3.S3ConfigProperty(
                    bucket_access_role_arn=Fn.import_value(role_name_export))
                )
                
            # Add remaining configs if present
            if "subDirectory" in bc:
                location.subdirectory=bc["subDirectory"]
            if "storageClass" in bc:
                location.s3_storage_class=bc["storageClass"]

            # TODO: Add tags support
            #            if "tags" in bc and len(bc["tags"]) > 0:
            #                location.tags = bc["tags"]
            
            # Add this location to the result dict
            s3_locations_dict[bc["bucketName"]] = location
            i+=1
        
        return s3_locations_dict
    
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Process the bucket configurations
        bucket_configs = self.node.try_get_context("S3_datasync_locations")
        if bucket_configs:
            # Add the arn to bucket_config, if it is not provided already. Creates S3 buckets if needed
            for b in bucket_configs:
                if not "arn" in b:
                    b["arn"] = self.get_bucket_arn(b)
        else:
            print("ERROR: Please set a context variable for S3_datasync_locations")
        
        
        # Create the locations
        s3_locations_dict = self.create_datasync_s3_locations(bucket_configs)
        
        
        # Process the task configurations
        datasync_tasks = self.node.try_get_context("S3_datasync_tasks")
        if datasync_tasks:
            for task in datasync_tasks:
                self.create_datasync_s3_task(s3_locations_dict[task["source"]],s3_locations_dict[task["destination"]])
        else:
            print("ERROR: Please set a context variable for S3_datasync_locations")
        
        
