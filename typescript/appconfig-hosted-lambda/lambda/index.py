"""Lambda handler that reads feature flags from AppConfig via the Lambda Extension.

The AppConfig Lambda Extension runs as a local HTTP server on port 2772.
It handles caching, polling, and session management automatically.
"""

import json
import os
import urllib.request

APPCONFIG_APP = os.environ["APPCONFIG_APP"]
APPCONFIG_ENV = os.environ["APPCONFIG_ENV"]
APPCONFIG_CONFIG = os.environ["APPCONFIG_CONFIG"]

EXTENSION_URL = (
    f"http://localhost:2772/applications/{APPCONFIG_APP}"
    f"/environments/{APPCONFIG_ENV}"
    f"/configurations/{APPCONFIG_CONFIG}"
)


def get_config() -> dict:
    """Fetch configuration from the AppConfig Lambda Extension."""
    req = urllib.request.Request(EXTENSION_URL)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())


def is_enabled(config: dict, flag_name: str) -> bool:
    """Check if a feature flag is enabled."""
    return config.get("values", {}).get(flag_name, {}).get("enabled", False)


def handler(event, context):
    config = get_config()

    flags = {
        flag: is_enabled(config, flag)
        for flag in config.get("flags", {})
    }

    print(f"Feature flags: {json.dumps(flags)}")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "flags": flags,
            "message": "Dark mode is ON" if flags.get("dark_mode") else "Dark mode is OFF",
        }),
    }
