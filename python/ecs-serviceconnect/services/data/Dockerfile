# Use the official Python image
FROM --platform=linux/amd64 python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# Install all dependencies
RUN pip install -r requirements.txt

# Set environment variables (optional)
ENV SERVICE_B_PORT=5001

# Expose the port your Flask app will run on
# EXPOSE 5001

# Command to run the application
CMD ["python", "data.py"]
