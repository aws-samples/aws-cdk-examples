import pika
import ssl

def publish_messages():
    # Replace with your RabbitMQ connection details
    username = 'your_rabbitmq_username'  # Retrieve your RabbitMQ username from AWS Secrets Manager
    password = 'your_rabbitmq_password'  # Retrieve your RabbitMQ password from AWS Secrets Manager
    broker_endpoint = 'your_broker_id.mq.us-west-2.amazonaws.com'  # Replace with your RabbitMQ broker endpoint (no protocol)
    port = 5671  # AMQPS port
    queue_name = 'testQueue'

    # Create credentials
    credentials = pika.PlainCredentials(username, password)

    # Create SSL context
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False  # Change to True if you want hostname verification
    ssl_context.verify_mode = ssl.CERT_NONE  # Change to ssl.CERT_REQUIRED if you have proper certificates

    # Create connection parameters with SSL
    parameters = pika.ConnectionParameters(
        host=broker_endpoint,
        port=port,
        credentials=credentials,
        ssl_options=pika.SSLOptions(context=ssl_context)  # Use ssl_options
    )

    # Establish the connection
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Declare the queue (it will create if it doesn't exist)
    channel.queue_declare(queue=queue_name, durable=True)

    # Publish 3 test messages
    for i in range(1, 4):
        message = f'Hello World {i}'
        channel.basic_publish(
            exchange='',
            routing_key=queue_name,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
            )
        )
        print(f'Sent: {message}')

    # Clean up
    connection.close()

if __name__ == '__main__':
    publish_messages()
