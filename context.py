# The function checks cdk.json for the given key and returns the value.
import json
import re
import sys

# Usage Statement
usage_statement = f"""
Usage: {sys.argv[0]} [arg]
    arg:
        --set
        --print
        --validate
"""


def get_cdk_json_context_value(key: str) -> str:
    with open("cdk.json", "r", encoding='utf-8') as f:
        cdk_json = json.load(f)
    return cdk_json["context"][key]


# The function updates cdk.json with the given key and value.
def update_cdk_json_context_value(key: str, value: str | bool) -> None:
    with open("cdk.json", "r", encoding='utf-8') as f:
        cdk_json = json.load(f)
    cdk_json["context"][key] = value
    with open("cdk.json", "w", encoding='utf-8') as f:
        json.dump(cdk_json, f, indent=4)


def get_valid_value(key: str) -> str:
    """
    Prompts the user to provide a valid value for the given key.
    """
    while True:
        if key == "ad_domain_name":
            prompt = "Enter a valid Microsoft Active Directory domain: "
        elif key == "ad_edition":
            prompt = "Enter a valid 'ad_edition', must be either 'Standard' or 'Enterprise': "
        elif key == "vpc_id":
            prompt = "Enter a valid vpc-id: "
        elif key == "internet_access" and get_cdk_json_context_value("vpc_id") is None:
            prompt = "Should the created VPC have internet access? (y/N): "
        value = input(prompt)
        if key == "internet_access":
            value = bool(value)
        if validate_value(key, value):
            update_cdk_json_context_value(key, value)
            return True


def validate_value(key: str, value: str | bool | None = None) -> bool:
    if value is None:
        value = get_cdk_json_context_value(key)
    if key == "initial_password":
        if value is None or isinstance(value, str):
            return True
        else:
            return False
    elif key == "ad_domain_name":
        regex = r"^(?:[a-zA-Z0-9]+(?:\-*[a-zA-Z0-9])*\.)+[a-zA-Z0-9]{2,63}$"
        if value is not None and re.match(regex, value):
            return True
        else:
            return False

    elif key == "ad_edition":
        regex = r"^(Standard|Enterprise)$"
        if value is not None and re.match(regex, value):
            return True
        else:
            return False

    elif key == "vpc_id":
        regex = r"^vpc-[0-9a-f]{8}$"
        if value is None or re.match(regex, value):
            return True
        else:
            return False

    elif key == "internet_access":
        if isinstance(value, bool):
            return True
        else:
            return False

    return True


def validate_context():
    for key in [
        "initial_password",
        "ad_domain_name",
        "ad_edition",
        "vpc_id",
        "internet_access",
    ]:
        while not validate_value(key):
            get_valid_value(key)
    return True


def collect_context():
    for key in ["ad_domain_name", "ad_edition", "vpc_id"]:
        value = get_cdk_json_context_value(key)
        if value is None:
            if (
                key == "internet_access"
                and get_cdk_json_context_value("vpc_id") is None
            ):
                value = False
                update_cdk_json_context_value(key, value)
            elif key == "vpc_id":
                response = input(f"Would you like use an existing VPC? (y/N): ")
                if bool(response):
                    value = get_valid_value("vpc_id")
                    update_cdk_json_context_value(key, True)
                else:
                    print("Creating a new VPC...")
                    update_cdk_json_context_value(key, None)
                    response = input(
                        f"Would you like to the new VPC to have internet access? (y/N): "
                    )
                    if bool(response):
                        update_cdk_json_context_value("internet_access", True)
                    else:
                        update_cdk_json_context_value("internet_access", False)
            else:
                get_valid_value(key)
        else:
            print(f"The value of {key} is {value}")
            response = input(f"Would you like to update the value? (y/N): ")
            if response.lower() == "y":
                get_valid_value(key)
    return True


if sys.argv[1] in ["--set", "set"]:
    collect_context()
    sys.exit(0)
elif sys.argv[1] in ["--validate", "validate"]:
    validate_context()
    sys.exit(0)
elif sys.argv[1] in ["--print", "print"]:
    for key in ["ad_domain_name", "ad_edition", "vpc_id", "internet_access"]:
        value = get_cdk_json_context_value(key)
        if value is not None:
            print(f"{key}: {value}")
        else:
            print(f"{key}: None")
else:
    print(
        f"""
          Invalid argument {sys.argv[1]}
          {usage_statement}
          """
    )
    sys.exit(1)
