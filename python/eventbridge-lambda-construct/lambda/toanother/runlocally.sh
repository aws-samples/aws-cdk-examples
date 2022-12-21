DOCKER_BUILDKIT=0 docker build -t awslambdaservice .
docker run -p 9000:8080 awslambdaservice