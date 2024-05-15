import os
import json
import string


def validate_ad_domain_name(ad_domain_name):
    """
    Validates the Active Directory (AD) domain name.

    Args:
        ad_domain_name (str): The AD domain name to validate.

    Returns:
        bool: True if the AD domain name is valid, False otherwise.
    """
    if len(ad_domain_name) < 2 or len(ad_domain_name) > 255:
        return False

    if not ad_domain_name[0].isalnum():
        return False

    if ad_domain_name[-1] in ["-", "."]:
        return False

    if any(
        c
        in [
            ",",
            "~",
            ":",
            "!",
            "@",
            "#",
            "$",
            "%",
            "^",
            "&",
            "'",
            "(",
            ")",
            "{",
            "}",
            "_",
            " ",
        ]
        for c in ad_domain_name
    ):
        return False

    if not all(
        c in string.ascii_letters + string.digits + ".-" for c in ad_domain_name
    ):
        return False

    return True


def validate_context():
    """
    Validates the contents of the cdk.context.json file.

    Raises:
        ValueError: If the cdk.context.json file does not exist or is missing required keys.
    """
    context_file = "cdk.context.json"

    # Check if the context file exists
    if not os.path.exists(context_file):
        raise ValueError(
            f"The {context_file} file does not exist, execute `python3 set_context.py` to create the context."
        )

    # Load the context file
    with open(context_file, "r") as f:
        context = json.load(f)

    # Check if the required keys are present
    required_keys = ["vpc_id", "ad_domain_name", "secret_arn"]
    for key in required_keys:
        if key not in context:
            raise ValueError(
                f"The {context_file} file is missing the required key: {key}, execute  `python3 set_context.py` to update the context."
            )

    # Validate the AD domain name
    if not validate_ad_domain_name(context["ad_domain_name"]):
        raise ValueError(f"Invalid AD domain name: {context['ad_domain_name']}")

    # Return the context
    return context
