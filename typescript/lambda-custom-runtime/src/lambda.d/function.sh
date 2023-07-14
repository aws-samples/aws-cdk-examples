function handler() {
  EVENT_DATA="$1"

  export EVENT_DATA

  RESPONSE="$(./${USER_EXECUTABLE})"

  # send to cloudwatch logs
  echo "$RESPONSE" 1>&2;
}