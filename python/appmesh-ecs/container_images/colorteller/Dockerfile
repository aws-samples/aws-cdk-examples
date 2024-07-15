FROM public.ecr.aws/amazonlinux/amazonlinux:2 AS builder
RUN yum update -y && \
    yum install -y ca-certificates unzip tar gzip git && \
    yum clean all && \
    rm -rf /var/cache/yum

RUN curl -LO https://golang.org/dl/go1.17.1.linux-amd64.tar.gz && \
    tar -C /usr/local -xzvf go1.17.1.linux-amd64.tar.gz

ENV PATH="${PATH}:/usr/local/go/bin"
ENV GOPATH="${HOME}/go"
ENV PATH="${PATH}:${GOPATH}/bin"

ARG GO_PROXY=https://proxy.golang.org
WORKDIR /go/src/github.com/aws/aws-app-mesh-examples/colorapp/teller

# go.mod and go.sum go into their own layers.
COPY go.mod .
COPY go.sum .

# Set the proxies for the go compiler
RUN go env -w GOPROXY=${GO_PROXY}
# This ensures `go mod download` happens only when go.mod and go.sum change.
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix nocgo -o /aws-app-mesh-examples-colorapp-teller .

FROM public.ecr.aws/amazonlinux/amazonlinux:2
RUN yum update -y && \
    yum install -y ca-certificates && \
    yum clean all && \
    rm -rf /var/cache/yum

COPY --from=builder /aws-app-mesh-examples-colorapp-teller /bin/aws-app-mesh-examples-colorapp-teller

ENTRYPOINT ["/bin/aws-app-mesh-examples-colorapp-teller"]
