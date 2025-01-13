from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

# URL for the backend service (service_b) from the environment variable
# service B URL will data.scapp.local
SERVICE_B_URL = os.environ.get('SERVICE_B_URL', 'http://localhost:5001/data')

@app.route('/get-data', methods=['GET'])
def get_data():
    """Fetch data from the backend service (service_b)."""
    try:
        response = requests.get("http://"+SERVICE_B_URL+":5001/data")
        response.raise_for_status()  # Raise an error for bad responses
        data = response.json()  # Parse the JSON response
        return jsonify(data), 200  # Return data from service_b
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500  # Return error if the request fails

@app.route('/', methods=['GET'])
def main():
    return jsonify({"message": "Hello from frontend Flask!"}), 200
if __name__ == '__main__':
    app.run(debug=True, port=5000)
