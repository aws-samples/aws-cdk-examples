import string
import boto3
from botocore.exceptions import ClientError
import json
import os
import random


class VpcConfig:
    def __init__(self, vpc_id, internet_access):
        self.vpc_id = vpc_id
        self.internet_access = internet_access


def create_secret_if_not_exists(secret_name):
    """
    Checks if a secret exists in AWS Secrets Manager, and creates a new one if it doesn't.
    If the secret already exists, it prompts the user to provide a new secret name until a unique one is found.

    Args:
        secret_name (str): The name of the secret to check/create.

    Returns:
        str: The ARN of the secret.
    """
    secrets_manager = boto3.client("secretsmanager")

    while True:
        try:
            # Check if the secret exists
            response = secrets_manager.describe_secret(SecretId=secret_name)
            use_existing = input(
                f"Secret '{secret_name}' already exists, do you want to use the existing secret? (Y/n) "
            ).lower()
            if use_existing == "n":
                secret_name = input(f"Provide a name for the new secret: ")
            else:
                return response["ARN"]
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                # Secret doesn't exist, create a new one
                print(f"Secret '{secret_name}' does not exist. Creating a new one.")
                response = secrets_manager.create_secret(
                    Name=secret_name,
                )
                return response["ARN"]
            else:
                # Some other error occurred
                raise e


def get_or_create_vpc():
    """
    Prompts the user to choose between using an existing VPC or creating a new one.
    If the user chooses an existing VPC, it validates the VPC ID.
    If the user chooses to create a new VPC, it creates a new VPC and returns its ID.

    Returns:
        dict: A dictionary containing the VPC ID and the internet access status (boolean).
    """
    ec2 = boto3.client("ec2")

    # Prompt the user to choose between using an existing VPC or creating a new one
    use_existing_vpc = input("Do you want to use an existing VPC? (y/N) ").lower()

    if use_existing_vpc == "y":
        # Get the VPC ID from the user
        vpc_id = input("Enter the VPC ID: ")

        # Validate the VPC ID
        try:
            response = ec2.describe_vpcs(VpcIds=[vpc_id])
            if response["Vpcs"]:
                print(f"Using existing VPC: {vpc_id}")
                return {"vpc_id": vpc_id, "internet_access": False}
            else:
                print("Invalid VPC ID. Please try again.")
                return get_or_create_vpc()
        except ClientError as e:
            if e.response["Error"]["Code"] == "InvalidVpcID.NotFound":
                print("Invalid VPC ID. Please try again.")
                return get_or_create_vpc()
            else:
                raise e
    else:
        # Create a new VPC
        print("A new VPC will be created...")
        response = input("Should the new VPC have internet access? (y/N)").lower()
        if response == "y":
            internet_access = True
        else:
            internet_access = False

        return VpcConfig(None, internet_access)


def get_ad_edition():
    """
    Prompts the user to enter the Active Directory (AD) edition and validates the input.

    Returns:
        str: The valid AD edition, either "Standard" or "Enterprise".
    """
    valid_editions = ["STANDARD", "ENTERPRISE"]

    ad_edition = (
        input("Enter the Active Directory (AD) edition (default is Standard): ")
        .upper()
        .strip()
    )

    if not ad_edition:
        return "Standard"

    if ad_edition in valid_editions:
        return " ".join(
            "".join([w[0].upper(), w[1:].lower()]) for w in ad_edition.split()
        )
    else:
        print(f"Invalid AD edition. Please enter either 'Standard' or 'Enterprise'.")
        return get_ad_edition()


def get_ad_domain_name():
    """
    Prompts the user to enter an Active Directory (AD) domain name and validates it.

    Returns:
        str: The valid AD domain name.
    """
    from managed_ad.validate_context import validate_ad_domain_name

    # Prompt the user to enter the AD domain name
    ad_domain_name = input("Enter the Active Directory (AD) domain name: ")

    # Validate the AD domain name
    if validate_ad_domain_name(ad_domain_name):
        return ad_domain_name
    else:
        print("Invalid AD domain name. Please try again.")
        return get_ad_domain_name()


def generate_random_string(length=32):
    """
    Generates a random string of the specified length, containing uppercase letters, lowercase letters, digits, and special characters.

    Args:
        length (int): The length of the random string to generate (default is 16).

    Returns:
        str: The generated random string.
    """
    secrets_manager = boto3.client("secretsmanager")
    response = secrets_manager.get_random_password(PasswordLength=length)
    return response["RandomPassword"]


def create_context(context_file):
    """
    Writes the provided variables to a JSON file.

    Args:
        ad_domain_name (str): The Active Directory domain name.
        vpc_id (str): The VPC ID.
        secret_arn (str): The ARN of the secret.
    """
    ad_domain_name = get_ad_domain_name()
    ad_edition = get_ad_edition()
    vpc_info = get_or_create_vpc()
    secret_name = f"ad-password-{ad_domain_name}"
    secret_arn = create_secret_if_not_exists(secret_name)
    initial_password = generate_random_string(16)
    context = {
        "ad_domain_name": ad_domain_name,
        "ad_edition": ad_edition,
        "initial_password": initial_password,
        "vpc_id": vpc_info.vpc_id,
        "internet_access": vpc_info.internet_access,
        "secret_arn": secret_arn,
    }

    # Write the context to a JSON file
    with open(context_file, "w") as f:
        json.dump(context, f, indent=2)

    print(f"Context written to {context_file}")


def update_context(context_file, context):
    """
    Checks for an existing cdk.context.json file and allows the user to update the context if desired.

    Returns:
        dict: The updated context.
    """
    # Ask the user if they want to update the context
    update_context_file = input("Do you want to update the context? (y/N) ").lower()
    if update_context_file == "y":
        # Prompt the user for new values, using the existing values as defaults
        context["vpc_id"] = (
            input(f"Enter the VPC ID (default: {context['vpc_id']}): ")
            or context["vpc_id"]
        )
        context["internet_access"] = input(
            f"Enable internet access for the VPC [True/False] (default: {context['internet_access']}): "
        ).title() or bool(context["internet_access"])
        context["ad_domain_name"] = (
            input(f"Enter the AD domain name (default: {context['ad_domain_name']}): ")
            or context["ad_domain_name"]
        )
        context["ad_domain_edition"] = (
            input(f"Enter the AD edition (default: {context['ad_edition']}): ")
            or context["ad_edition"]
        )
        context["secret_arn"] = (
            input(
                f"Enter the AD password secret ARN (default: {context['secret_arn']}): "
            )
            or context["secret_arn"]
        )
        context["initial_password"] = context["initial_password"]
        # Write the updated context to the file
        with open(context_file, "w") as f:
            json.dump(context, f, indent=2)

        print(f"Context written to {context_file}")
        return context
    else:
        return context


context_file = "cdk.context.json"
if os.path.exists(context_file):
    # Load the existing context
    with open(context_file, "r") as f:
        context = json.load(f)
    print(f"Existing context:\n {json.dumps(context, indent=2)}")
    update_context(context_file, context)
else:
    create_context(context_file)
    with open(context_file, "r") as f:
        context = json.load(f)
    print(f"Existing context:\n {json.dumps(context, indent=2)}")
    update_context(context_file, context)
