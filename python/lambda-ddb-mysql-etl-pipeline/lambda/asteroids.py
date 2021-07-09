import requests
import json
from requests.exceptions import Timeout
from requests.exceptions import HTTPError
from botocore.exceptions import ClientError
from datetime import date
import csv
import os
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

class Asteroids:
    """Client to NASA API and execution interface to branch data processing by file type.

    Notes:
        This class doesn't look like a normal class. It is a simple example of how one might
        workaround AWS Lambda's limitations of class use in handlers. It also allows for 
        better organization of code to simplify this example. If one planned to add
        other NASA endpoints or process larger amounts of Asteroid data for both .csv and .json formats,
        asteroids_json and asteroids_csv should be modularized and divided into separate lambdas
        where stepfunction orchestration is implemented for a more comprehensive workflow.
        However, for the sake of this demo I'm keeping it lean and easy.
    """

    def execute(self, format):
        """Serves as logical interface to assign class attributes and execute class methods

        Raises:
            Exception: If file format is not of .json or .csv file types.
        Notes:
            Have fun!
        """
        self.file_format=format
        self.today=date.today().strftime('%Y-%m-%d')
        # method call below used when Secrets Manager integrated. See get_secret.__doc__ for more.
        # self.api_key=get_secret('nasa_api_key')
        self.api_key=os.environ["NASA_KEY"]
        self.endpoint=f"""https://api.nasa.gov/neo/rest/v1/feed?start_date={self.today}&end_date={self.today}&api_key={self.api_key}"""
        self.response_object=self.nasa_client(self.endpoint)
        self.processed_response=self.process_asteroids(self.response_object)
        if self.file_format == "json":
            self.asteroids_json(self.processed_response)
        elif self.file_format == "csv":
            self.asteroids_csv(self.processed_response)
        else:
            raise Exception("FILE FORMAT NOT RECOGNIZED")
        self.write_to_s3()

    def nasa_client(self, endpoint):
        """Client component for API call to NASA endpoint.

        Args:
            endpoint (str): Parameterized url for API call.
        Raises:
            Timeout: If connection not made in 5s and/or data not retrieved in 15s.
            HTTPError & Exception: Self-explanatory
        Notes:
            See Cloudwatch logs for debugging.
        """
        try:
            response = requests.get(endpoint, timeout=(5, 15))
        except Timeout as timeout:
            print(f"NASA GET request timed out: {timeout}")
        except HTTPError as http_err:
            print(f"HTTP error occurred: {http_err}")
        except Exception as err:
            print(f'Other error occurred: {err}')
        else:
            return json.loads(response.content)

    def process_asteroids(self, payload):
        """Process old, and create new, data object with content from response.

        Args:
            payload (b'str'): Binary string of asteroid data to be processed.
        """
        near_earth_objects = payload["near_earth_objects"][f"{self.today}"]
        asteroids = []
        for neo in near_earth_objects:
            asteroid_object = {
                "id" : neo['id'],
                "name" : neo['name'],
                "hazard_potential" : neo['is_potentially_hazardous_asteroid'],
                "est_diameter_min_ft": neo['estimated_diameter']['feet']['estimated_diameter_min'],
                "est_diameter_max_ft": neo['estimated_diameter']['feet']['estimated_diameter_max'],
                "miss_distance_miles": [item['miss_distance']['miles'] for item in neo['close_approach_data']],
                "close_approach_exact_time": [item['close_approach_date_full'] for item in neo['close_approach_data']]
            }
            asteroids.append(asteroid_object)

        return asteroids

    def asteroids_json(self, payload):
        """Creates json object from payload content then writes to .json file.

        Args:
            payload (b'str'): Binary string of asteroid data to be processed.
        """
        json_file = open(f"/tmp/asteroids_{self.today}.json",'w')
        json_file.write(json.dumps(payload, indent=4))
        json_file.close()

    def asteroids_csv(self, payload):
        """Creates .csv object from payload content then writes to .csv file.
        """
        csv_file=open(f"/tmp/asteroids_{self.today}.csv",'w', newline='\n')
        fields=list(payload[0].keys())
        writer=csv.DictWriter(csv_file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(payload)
        csv_file.close()

    def get_secret(self):
        """Gets secret from AWS Secrets Manager

        Notes:
            Not necessary for CDK example but required in regular envs
            thus leaving for use
        """
        try:
            session = boto3.session.Session()
            client = session.client(service_name='secretsmanager'
                , region_name=os.environ['REGION'])
            SECRET = client.get_secret_value(SecretId=os.environ['LAMBDA_DWR_SECRET'])
            if 'SecretString' in SECRET:
                SECRETS = json.loads(SECRET['SecretString'])
            else:
                SECRETS = json.loads(b64decode(SECRET['SecretBinary']))
        except Exception:
            logger.error("ERROR: Unable to GET/Process DWR Secret")

        return SECRETS

    def write_to_s3(self):
        """Uploads both .json and .csv files to s3
        """
        s3 = boto3.client('s3')
        s3.upload_file(f"/tmp/asteroids_{self.today}.{self.file_format}", os.environ['S3_BUCKET'], f"asteroid_data/asteroids_{self.today}.{self.file_format}")


def handler(event, context):
    """Instantiates class and triggers execution method.

    Args:
        event (dict): Lists a custom dict that determines interface control flow--i.e. `csv` or `json`.
        context (obj): Provides methods and properties that contain invocation, function and
            execution environment information. 
            *Not used herein.
    """
    asteroids = Asteroids()
    asteroids.execute(event)
    