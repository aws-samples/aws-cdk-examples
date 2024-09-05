import boto3
import os
import json
import subprocess
import requests
import shutil


def get_secret():
    secret_name = os.environ["GITHUB_TOKEN_SECRET_NAME"]
    region_name = os.environ["DEFAULT_REGION"]

    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region_name)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except Exception as e:
        print(f"Error getting secret: {str(e)}")
        raise

    return get_secret_value_response["SecretString"]


def run_command(command):
    process = subprocess.Popen(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"Command failed: {stderr.decode('utf-8')}")
    return stdout.decode("utf-8")


def handler(event, context):
    github_token = get_secret()
    owner = os.environ["GITHUB_OWNER_NAME"]
    repo_name = os.environ["GITHUB_REPO_NAME"]

    # Import the GitHub source credential
    codebuild = boto3.client("codebuild")

    # Delete existing GitHub credentials if any
    existing_creds = codebuild.list_source_credentials()
    for cred in existing_creds["sourceCredentialsInfos"]:
        if cred["serverType"] == "GITHUB":
            codebuild.delete_source_credentials(arn=cred["arn"])

    # Import new GitHub credential
    response = codebuild.import_source_credentials(
        token=github_token, serverType="GITHUB", authType="PERSONAL_ACCESS_TOKEN"
    )
    print(f"Source credential ARN: {response['arn']}")

    # Create a new GitHub repository
    os.chdir("/var/task")
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    data = {"name": repo_name, "auto_init": True}
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 201:
        print(f"Repository {repo_name} created successfully.")
    else:
        print(f"Failed to create repository: {response.status_code} - {response.text}")

    run_command("rm -rf /tmp/repo")

    # Clone the repository
    os.mkdir("/tmp/repo")
    repo_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
    run_command(f"git clone {repo_url} /tmp/repo")
    print("Repository cloned successfully.")

    # Copy apps/ to git repo
    shutil.copytree(event["dir_path"], "/tmp/repo/", dirs_exist_ok=True)
    files = os.listdir("/tmp/repo")
    print(f"Files in the repository: {files}")

    # Commit and push changes
    try:
        os.chdir("/tmp/repo")
        print(f"Current working directory: {os.getcwd()}")
        print("1")
        run_command('GIT_TRACE=2 git config --global user.name "AWS Lambda"')
        print("2")
        run_command(
            'GIT_TRACE=2 git config --global user.email "lambda@awscdkexample.com"'
        )
        print("3")
        status_output = run_command("git status")
        print(f"Git status: {status_output}")
        run_command("GIT_TRACE=2 git add .")
        print("4")
        run_command('GIT_TRACE=2 git commit -m "Update files via Lambda"')
        print("5")
        run_command("GIT_TRACE=2 git push")
        print("Successfully pushed changes to the repository")
    except Exception as e:
        print(f"Error committing or pushing changes: {str(e)}")

    return {"statusCode": 200, "body": json.dumps("Repository updated successfully")}
