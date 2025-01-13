# Use the official Python image
FROM --platform=linux/amd64 python:3.12-slim

ARG SERVICE_B_URL_BUILD_ARG
ENV SERVICE_B_URL=$SERVICE_B_URL_BUILD_ARG

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# Install all dependencies
RUN pip install -r requirements.txt

# Set environment variables (optional)

# Expose the port your Flask app will run on
# EXPOSE 5001

# Command to run the application
CMD ["python", "frontend.py"]
