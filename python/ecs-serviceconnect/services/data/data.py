from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/data', methods=['GET'])
def get_data():
    """Returns some sample data from the backend."""
    sample_data = {
        "message": "Hello from Service B!",
        "data": [1, 2, 3, 4, 5]
    }
    return jsonify(sample_data)
@app.route('/', methods=['GET'])
def main():
    return jsonify({"message": "Hello from backend Flask!"}), 200
if __name__ == '__main__':
    app.run(debug=True, port=int(os.environ.get("SERVICE_B_PORT", 5001)))  # Use environment variable for port
