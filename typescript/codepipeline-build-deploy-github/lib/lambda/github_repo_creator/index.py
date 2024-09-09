import os
import json
import subprocess
import shutil
import boto3
import requests


def get_secret():
    secret_name = os.environ["GITHUB_TOKEN_SECRET_NAME"]
    region_name = os.environ["DEFAULT_REGION"]

    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response["SecretString"]
    except Exception as e:
        print(f"Error getting secret: {str(e)}")
        raise


def run_command(command):
    process = subprocess.Popen(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True
    )
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"Command failed: {stderr.decode('utf-8')}")
    return stdout.decode("utf-8")


def create_github_repo(github_token, repo_name):
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


def setup_git_config():
    run_command('git config --global user.name "AWS Lambda"')
    run_command('git config --global user.email "lambda@awscdkexample.com"')


def clone_and_update_repo(github_token, owner, repo_name, dir_path):
    repo_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
    run_command(f"git clone {repo_url} /tmp/repo")
    print("Repository cloned successfully.")

    shutil.copytree(dir_path, "/tmp/repo/", dirs_exist_ok=True)
    files = os.listdir("/tmp/repo")
    print(f"Files in the repository: {files}")

    os.chdir("/tmp/repo")
    setup_git_config()

    run_command("git add .")
    run_command('git commit -m "Update files via Lambda"')
    run_command("git push")
    print("Successfully pushed changes to the repository")


def handler(event, context):
    github_token = get_secret()
    owner = os.environ["GITHUB_OWNER_NAME"]
    repo_name = os.environ["GITHUB_REPO_NAME"]

    # Import GitHub source credential
    codebuild = boto3.client("codebuild")
    response = codebuild.import_source_credentials(
        token=github_token,
        serverType="GITHUB",
        authType="PERSONAL_ACCESS_TOKEN",
        shouldOverwrite=True,
    )
    print(f"Source credential ARN: {response['arn']}")

    # Clean up any existing repo in /tmp
    run_command("rm -rf /tmp/repo")

    # Create a new GitHub repository
    create_github_repo(github_token, repo_name)

    try:
        clone_and_update_repo(github_token, owner, repo_name, event["dir_path"])
    except Exception as e:
        print(f"Error committing or pushing changes: {str(e)}")

    return {"statusCode": 200, "body": json.dumps("Repository updated successfully")}
