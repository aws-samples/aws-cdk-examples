package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/aws/aws-xray-sdk-go/xray"
	"github.com/pkg/errors"
)

const defaultPort = "8080"
const defaultStage = "default"
const maxColors = 1000

var colors [maxColors]string
var colorsIdx int
var colorsMutext = &sync.Mutex{}

func getServerPort() string {
	port := os.Getenv("SERVER_PORT")
	if port != "" {
		return port
	}

	return defaultPort
}

func getStage() string {
	stage := os.Getenv("STAGE")
	if stage != "" {
		return stage
	}

	return defaultStage
}

func getColorTellerEndpoint() (string, error) {
	colorTellerEndpoint := os.Getenv("COLOR_TELLER_ENDPOINT")
	if colorTellerEndpoint == "" {
		return "", errors.New("COLOR_TELLER_ENDPOINT is not set")
	}
	return colorTellerEndpoint, nil
}

type colorHandler struct{}

func (h *colorHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	color, err := getColorFromColorTeller(request)
	if err != nil {
		writer.WriteHeader(http.StatusInternalServerError)
		writer.Write([]byte("500 - Unexpected Error"))
		return
	}

	colorsMutext.Lock()
	defer colorsMutext.Unlock()

	addColor(color)
	statsJson, err := json.Marshal(getRatios())
	if err != nil {
		fmt.Fprintf(writer, `{"color":"%s", "error":"%s"}`, color, err)
		return
	}
	fmt.Fprintf(writer, `{"color":"%s", "stats": %s}`, color, statsJson)
}

func addColor(color string) {
	colors[colorsIdx] = color

	colorsIdx += 1
	if colorsIdx >= maxColors {
		colorsIdx = 0
	}
}

func getRatios() map[string]float64 {
	counts := make(map[string]int)
	var total = 0

	for _, c := range colors {
		if c != "" {
			counts[c] += 1
			total += 1
		}
	}

	ratios := make(map[string]float64)
	for k, v := range counts {
		ratio := float64(v) / float64(total)
		ratios[k] = math.Round(ratio*100) / 100
	}

	return ratios
}

type clearColorStatsHandler struct{}

func (h *clearColorStatsHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	colorsMutext.Lock()
	defer colorsMutext.Unlock()

	colorsIdx = 0
	for i := range colors {
		colors[i] = ""
	}

	fmt.Fprint(writer, "cleared")
}

func getColorFromColorTeller(request *http.Request) (string, error) {
	colorTellerEndpoint, err := getColorTellerEndpoint()
	if err != nil {
		return "-n/a-", err
	}

	client := xray.Client(&http.Client{})
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("http://%s", colorTellerEndpoint), nil)
	if err != nil {
		return "-n/a-", err
	}

	resp, err := client.Do(req.WithContext(request.Context()))
	if err != nil {
		return "-n/a-", err
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "-n/a-", err
	}

	color := strings.TrimSpace(string(body))
	if len(color) < 1 {
		return "-n/a-", errors.New("Empty response from colorTeller")
	}

	return color, nil
}

func getTCPEchoEndpoint() (string, error) {
	tcpEchoEndpoint := os.Getenv("TCP_ECHO_ENDPOINT")
	if tcpEchoEndpoint == "" {
		return "", errors.New("TCP_ECHO_ENDPOINT is not set")
	}
	return tcpEchoEndpoint, nil
}

type tcpEchoHandler struct{}

func (h *tcpEchoHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	endpoint, err := getTCPEchoEndpoint()
	if err != nil {
		writer.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(writer, "tcpecho endpoint is not set")
		return
	}

	log.Printf("Dialing tcp endpoint %s", endpoint)
	conn, err := net.Dial("tcp", endpoint)
	if err != nil {
		writer.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(writer, "Dial failed, err:%s", err.Error())
		return
	}
	defer conn.Close()

	strEcho := "Hello from gateway"
	log.Printf("Writing '%s'", strEcho)
	_, err = fmt.Fprintf(conn, strEcho)
	if err != nil {
		writer.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(writer, "Write to server failed, err:%s", err.Error())
		return
	}

	reply, err := bufio.NewReader(conn).ReadString('\n')
	if err != nil {
		writer.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(writer, "Read from server failed, err:%s", err.Error())
		return
	}

	fmt.Fprintf(writer, "Response from tcpecho server: %s", reply)
}

type pingHandler struct{}

func (h *pingHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	log.Println("ping requested, reponding with HTTP 200")
	writer.WriteHeader(http.StatusOK)
}

func main() {
	log.Println("Starting server, listening on port " + getServerPort())

	colorTellerEndpoint, err := getColorTellerEndpoint()
	if err != nil {
		log.Fatalln(err)
	}
	tcpEchoEndpoint, err := getTCPEchoEndpoint()
	if err != nil {
		log.Println(err)
	}

	log.Println("Using color-teller at " + colorTellerEndpoint)
	log.Println("Using tcp-echo at " + tcpEchoEndpoint)

	xraySegmentNamer := xray.NewFixedSegmentNamer(fmt.Sprintf("%s-gateway", getStage()))

	http.Handle("/color", xray.Handler(xraySegmentNamer, &colorHandler{}))
	http.Handle("/color/clear", xray.Handler(xraySegmentNamer, &clearColorStatsHandler{}))
	http.Handle("/tcpecho", xray.Handler(xraySegmentNamer, &tcpEchoHandler{}))
	http.Handle("/ping", xray.Handler(xraySegmentNamer, &pingHandler{}))
	log.Fatal(http.ListenAndServe(":"+getServerPort(), nil))
}
