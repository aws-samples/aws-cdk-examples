import boto3
import requests
import json

sm_client = boto3.client(service_name="sagemaker")
runtime_sm_client = boto3.client(service_name="sagemaker-runtime")

test_image_path = "https://github.com/dmlc/web-data/blob/master/mxnet/doc/tutorials/python/predict_image/cat.jpg?raw=true"
r = requests.get(test_image_path, allow_redirects=True)
payload = r.content

# save for human inspection
with open("test_image.jpg", "wb") as file:
    file.write(payload)

endpoint_response_resnet_18 = runtime_sm_client.invoke_endpoint(
    EndpointName="MultiModelEndpoint",
    ContentType="application/x-image",
    TargetModel="/resnet_18.tar.gz",  # resnet 18
    Body=payload,
)

print("RESNET 18:", *json.loads(endpoint_response_resnet_18["Body"].read()), sep="\n")
print("---------")

endpoint_response_resnet_152 = runtime_sm_client.invoke_endpoint(
    EndpointName="MultiModelEndpoint",
    ContentType="application/x-image",
    TargetModel="/resnet_152.tar.gz",  # resnet 152
    Body=payload,
)

print("RESNET 152:", *json.loads(endpoint_response_resnet_152["Body"].read()), sep="\n")
print("---------")
