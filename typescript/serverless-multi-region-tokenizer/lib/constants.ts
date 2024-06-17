/*! 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
*/

export namespace Constants {
    export const ddbTokenTable = "sensitive-data";
    //this is the partition key
    export const ddbPartitionKey = "tokenId";

    export const kmsMultiRegionKeyId = "mrk-92f783ae30e84899926644ce3d7e62d6";
    export const kmsMultiRegionKeyAlias = "sensitive-data-cmk";

    export const replicaRegion = 'ap-southeast-1';  //Singapore, note that primary region is set by CDK default

    //if you don't have a Route53 subdomain to use, don't deploy the Tokenizer-DNS
    export const myApiSubdomain : string = "";  //usually 'api'
    export const myDomainName : string = "";
}