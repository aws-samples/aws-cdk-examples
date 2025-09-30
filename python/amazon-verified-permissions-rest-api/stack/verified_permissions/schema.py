import json

cedar_json_schema = {
    "amazonverified": {
        "entityTypes": {
            "User": {
                "shape": {"type": "Record", "attributes": {}},
                "memberOfTypes": ["UserGroup"],
            },
            "UserGroup": {"shape": {"attributes": {}, "type": "Record"}},
            "Application": {"shape": {"attributes": {}, "type": "Record"}},
        },
        "actions": {
            "get /admin": {
                "appliesTo": {
                    "context": {"type": "Record", "attributes": {}},
                    "principalTypes": ["User"],
                    "resourceTypes": ["Application"],
                }
            },
            "get /user": {
                "appliesTo": {
                    "context": {"type": "Record", "attributes": {}},
                    "principalTypes": ["User"],
                    "resourceTypes": ["Application"],
                }
            },
            "get /": {
                "appliesTo": {
                    "context": {"type": "Record", "attributes": {}},
                    "principalTypes": ["User"],
                    "resourceTypes": ["Application"],
                }
            },
        },
    }
}


cedar_schema = {"cedar_json": json.dumps(cedar_json_schema)}
