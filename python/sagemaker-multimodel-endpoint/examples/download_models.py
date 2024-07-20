import requests
import os
import os.path
import tarfile
import shutil

resnet_18_params = (
    "http://data.mxnet.io/models/imagenet/resnet/18-layers/resnet-18-0000.params"
)
resnet_18_symbols = (
    "http://data.mxnet.io/models/imagenet/resnet/18-layers/resnet-18-symbol.json"
)

resnet_15_params = (
    "http://data.mxnet.io/models/imagenet/resnet/152-layers/resnet-152-0000.params"
)
resnet_15_symbols = (
    "http://data.mxnet.io/models/imagenet/resnet/152-layers/resnet-152-symbol.json"
)

synset = "http://data.mxnet.io/models/imagenet/synset.txt"

if not os.path.isdir("data/resnet_18"):
    os.makedirs("data/resnet_18")

    r = requests.get(resnet_18_params, allow_redirects=True)
    open("data/resnet_18/resnet-18-0000.params", "wb").write(r.content)

    r = requests.get(resnet_18_symbols, allow_redirects=True)
    open("data/resnet_18/resnet-18-symbol.json", "wb").write(r.content)

    r = requests.get(synset, allow_redirects=True)
    open("data/resnet_18/synset.txt", "wb").write(r.content)

    with open("data/resnet_18/resnet-18-shapes.json", "w") as file:
        file.write('[{"shape": [1, 3, 224, 224], "name": "data"}]')

    with tarfile.open("models/resnet_18.tar.gz", "w:gz") as tar:
        tar.add("data/resnet_18", arcname=".")

if not os.path.isdir("data/resnet_152"):
    os.makedirs("data/resnet_152")

    r = requests.get(resnet_15_params, allow_redirects=True)
    open("data/resnet_152/resnet-152-0000.params", "wb").write(r.content)

    r = requests.get(resnet_15_symbols, allow_redirects=True)
    open("data/resnet_152/resnet-152-symbol.json", "wb").write(r.content)

    r = requests.get(synset, allow_redirects=True)
    open("data/resnet_152/synset.txt", "wb").write(r.content)

    with open("data/resnet_152/resnet-152-shapes.json", "w") as file:
        file.write('[{"shape": [1, 3, 224, 224], "name": "data"}]')

    with tarfile.open("models/resnet_152.tar.gz", "w:gz") as tar:
        tar.add("data/resnet_152", arcname=".")

# Cleanup folder used for downloading models
shutil.rmtree("data")
