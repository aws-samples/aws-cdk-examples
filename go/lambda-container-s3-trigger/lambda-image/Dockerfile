FROM golang:1.15.6-alpine3.12 AS builder
WORKDIR /

# Disable cgo to create a static binary.
ENV CGO_ENABLED="0"

# Compile for 64-bit Linux
ENV GOOS="linux"
ENV GOARCH="amd64"

# Cache dependencies
ADD app.go go.mod go.sum ./
RUN go mod download

# Build
RUN go build -a -o app app.go

# Copy artifacts to a clean image
FROM scratch
WORKDIR /
EXPOSE 5000
COPY --from=builder /app /

CMD ["/app"]
