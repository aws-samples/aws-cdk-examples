import { readFileSync } from "fs";
import { resolve } from "path";

class ConfigClass {
  // The name of the Role to be created in the source account to be used for replication
  public readonly replicationRoleName: string;
  // The name of the Policy name for the replication role in the source account
  public readonly replicationRolePolicyName: string;
  // The Id of the Amazon Account that files should be replicated from.
  public readonly sourceAccountId: string;
  // The AWS Region for the S3 bucket that files should be replicated from.
  public readonly sourceRegion: string;
  // The name of the Amazon S3 bucket in the source account where files should be replicated from
  public readonly sourceBucketName: string;
  // The alias of the KMS key used for the S3 Bucket in the sourceKeyAlias account
  public readonly sourceKmsKeyAlias: string;
  // The Id of the Amazon Account that files should be replicated to.
  public readonly destinationAccountId: string;
  // The AWS Region for the S3 bucket that files should be replicated to.
  public readonly destinationRegion: string;
  // The name of the Amazon S3 bucket in the destination account where the files should be replicated to
  public readonly destinationBucketName: string;
  // The alias of the KMS key used for the S3 Bucket in the destination account
  public readonly destinationKmsKeyAlias: string;

  constructor(configFile: any) {
    if (!configFile.replicationRoleName) {
      throw new Error("Error: replicationRoleName must be specified.");
    }
    this.replicationRoleName = configFile.replicationRoleName;

    if (!configFile.replicationRolePolicyName) {
      throw new Error("Error: replicationRolePolicyName must be specified.");
    }
    this.replicationRolePolicyName = configFile.replicationRolePolicyName;

    if (!configFile.sourceAccountId) {
      throw new Error("Error: sourceAccountId must be specified.");
    }
    this.sourceAccountId = configFile.sourceAccountId;

    if (!configFile.sourceRegion) {
      throw new Error("Error: sourceRegion must be specified.");
    }
    this.sourceRegion = configFile.sourceRegion;

    if (!configFile.sourceBucketName) {
      throw new Error("Error: sourceBucketName must be specified.");
    }
    this.sourceBucketName = configFile.sourceBucketName;

    if (!configFile.destinationAccountId) {
      throw new Error("Error: destinationAccountId must be specified.");
    }
    this.destinationAccountId = configFile.destinationAccountId;

    if (!configFile.destinationRegion) {
      throw new Error("Error: destinationRegion must be specified.");
    }
    this.destinationRegion = configFile.destinationRegion;

    if (!configFile.destinationBucketName) {
      throw new Error("Error: destinationBucketName must be specified.");
    }
    this.destinationBucketName = configFile.destinationBucketName;

    if (!configFile.sourceKmsKeyAlias) {
      throw new Error("Error: sourceKmsKeyAlias must be specified.");
    }
    this.sourceKmsKeyAlias = configFile.sourceKmsKeyAlias;

    if (!configFile.destinationKmsKeyAlias) {
      throw new Error("Error: destinationKmsKeyAlias must be specified.");
    }
    this.destinationKmsKeyAlias = configFile.destinationKmsKeyAlias;
  }
}

export const Config = new ConfigClass(
  JSON.parse(readFileSync(resolve(__dirname, "config.json"), "utf8"))
);
