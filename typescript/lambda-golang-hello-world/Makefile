all: deps clean test build

deps:
	cd src && go get -u ./...
clean: 
	rm -rf ./.build/hello-world
test:
	cd src && go test
build:
	GOPATH=${GOPATH} GOOS=linux GOARCH=amd64 go build -o lambda_package/hello-world ./src