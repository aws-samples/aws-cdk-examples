# LAYERS
# - Lambda (Python code)
# - Resources (CDK-Python)

# aws lambda list-functions
LAMBDA_NAME := JohnMitchellLambdaS3CodeExample-Singleton8C7B99F3-1PDOTPPJ3I26W
ZIP_NAME := hello.zip
BUCKET_NAME := john-mitchell-lambda-code-bucket
all:

check-zip:
	test -d temp || mkdir temp
	(cd temp ; unzip -o ../hello.zip ; python -c "import hello")

update-lambda:
	black .
	zip ${ZIP_NAME} hello.py
	aws lambda update-function-code \
	--zip-file fileb://${ZIP_NAME} \
    --function-name ${LAMBDA_NAME} \
	--publish | egrep '(Name|Status)'

update: update-lambda

plan:
	pip install -qr ./requirements.txt
	cdk synth | egrep -B99 ^Cond

show-info:
	aws lambda list-functions | jq .Functions[].FunctionName

deploy:
	cdk deploy

ping:
	aws iam get-user

invoke:
	aws lambda invoke --function-name ${LAMBDA_NAME} /dev/stdout

setup-py:
	python3 -m venv .venv
	source .venv/bin/activate
	pip install -r ./requirements.txt