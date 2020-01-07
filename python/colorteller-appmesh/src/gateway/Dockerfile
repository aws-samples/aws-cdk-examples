FROM golang:1-stretch as builder
ARG GO_PROXY=https://proxy.golang.org
WORKDIR /go/src/github.com/aws/aws-app-mesh-examples/colorapp/gateway

# Force the go compiler to use modules.
ENV GO111MODULE=on

# go.mod and go.sum go into their own layers.
COPY go.mod .
COPY go.sum .

# Set the proxies for the go compiler
RUN go env -w GOPROXY=${GO_PROXY}
# This ensures `go mod download` happens only when go.mod and go.sum change.
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix nocgo -o /aws-app-mesh-examples-colorapp-gateway .

FROM amazonlinux:2
RUN yum install -y ca-certificates
COPY --from=builder /aws-app-mesh-examples-colorapp-gateway /bin/aws-app-mesh-examples-colorapp-gateway

ENTRYPOINT ["/bin/aws-app-mesh-examples-colorapp-gateway"]
