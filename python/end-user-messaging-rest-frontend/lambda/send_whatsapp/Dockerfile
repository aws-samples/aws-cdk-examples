FROM public.ecr.aws/lambda/python:3.12@sha256:92c88c1adc374b073b07b12bd4045497af7da68230d47c2b330423115c5850dc

#checkov:skip=CKV_DOCKER_2:Do not define a healthcheck, since this Lambda will be executed on triggers
#checkov:skip=CKV_DOCKER_3:Lambda functions do not require a USER statement as per https://docs.aws.amazon.com/lambda/latest/dg/images-create.html

# Install required dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code from the web image over here, that way we won't require
# installing composer in this image, too
COPY . .

# Run the main script
CMD [ "main.handler" ]
