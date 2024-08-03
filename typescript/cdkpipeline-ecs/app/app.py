from flask import Flask, request
import json

app = Flask(__name__)


@app.route("/", methods=["GET"])
def default_get():
    return json.dumps({"message": "Hello from ECS container"})


@app.route("/health", methods=["GET"])
def health_check():
    return json.dumps({"message": "Health Check pass"})


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80)
