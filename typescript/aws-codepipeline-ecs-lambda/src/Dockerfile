# syntax=docker/dockerfile:1

FROM python:3.12-slim-buster

WORKDIR /flask-app

COPY flask-app/requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY flask-app/ .

CMD [ "python3", "app.py"]
