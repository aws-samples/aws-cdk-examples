# Use a Python image as the base image
FROM python:3

# Set the working directory inside the container
WORKDIR /

# Copy the requirements.txt file to the container
COPY requirements.txt .

# Install the required packages
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application code to the container
COPY . .

# Specify the command to run when the container is started
CMD [ "python3", "./app.py" ]

#Expose app port
EXPOSE 80