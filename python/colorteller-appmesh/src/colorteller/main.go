package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-xray-sdk-go/xray"
)

const defaultPort = "8080"
const defaultColor = "black"
const defaultStage = "default"

func getServerPort() string {
	port := os.Getenv("SERVER_PORT")
	if port != "" {
		return port
	}

	return defaultPort
}

func getColor() string {
	color := os.Getenv("COLOR")
	if color != "" {
		return color
	}

	return defaultColor
}

func getStage() string {
	stage := os.Getenv("STAGE")
	if stage != "" {
		return stage
	}

	return defaultStage
}

type colorHandler struct{}
func (h *colorHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	log.Println("color requested, responding with", getColor())
	fmt.Fprint(writer, getColor())
}

type pingHandler struct{}
func (h *pingHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	log.Println("ping requested, reponding with HTTP 200")
	writer.WriteHeader(http.StatusOK)
}

func main() {
	log.Println("starting server, listening on port " + getServerPort())
	xraySegmentNamer := xray.NewFixedSegmentNamer(fmt.Sprintf("%s-colorteller-%s", getStage(), getColor()))
	http.Handle("/", xray.Handler(xraySegmentNamer, &colorHandler{}))
	http.Handle("/ping", xray.Handler(xraySegmentNamer, &pingHandler{}))
	http.ListenAndServe(":"+getServerPort(), nil)
}
