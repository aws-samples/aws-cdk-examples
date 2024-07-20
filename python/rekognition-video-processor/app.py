#!/usr/bin/env python3
import os

import aws_cdk as cdk

from rekognition_video_processor.rekognition_video_processor_stack import RekognitionVideoProcessorStack


app = cdk.App()
RekognitionVideoProcessorStack(app, "RekognitionVideoProcessorStack")

app.synth()
