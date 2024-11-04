{
    "Comment": "smiple workflow for the car company",
    "StartAt": "Order Received",
    "States": {
      "Order Received": {
        "Comment": "Order revieved.",
        "Type": "Pass",
        "Next": "RiskyCustomer"
      },
      "RiskyCustomer": {
        "Comment": "No risky business!",
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.risk",
            "BooleanEquals": true,
            "Next": "Yes"
          },
          {
            "Variable": "$.risk",
            "BooleanEquals": false,
            "Next": "No"
          }
        ],
        "Default": "Yes"
      },
      "Yes": {
        "Type": "Pass",
        "Next": "organize pickup"
      },
      "No": {
        "Type": "Fail",
        "Cause": "Not Hello World"
      },
      "organize pickup": {
        "Comment": "wait for client to pickup",
        "Type": "Wait",
        "Seconds": 3,
        "Next": "wait for 6 months"
      },
      "wait for 6 months": {
        "Comment": "wait for 6 months",
        "Type": "Wait",
        "Seconds": 3,
        "Next": "organize return"
      },
      "organize return": {
        "Comment": "wait for client to return",
        "Type": "Wait",
        "Seconds": 3,
        "Next": "Parallel State"
      },
      "Parallel State": {
        "Comment": "A Parallel state can be used to create parallel branches of execution in your state machine.",
        "Type": "Parallel",
        "Next": "return",
        "Branches": [
          {
            "StartAt": "book",
            "States": {
              "book": {
                "Type": "Pass",
                "End": true
              }
            }
          },
          {
            "StartAt": "calculate damage",
            "States": {
              "calculate damage": {
                "Type": "Pass",
                "End": true
              }
            }
          }
        ]
      },
      "return": {
        "Type": "Pass",
        "End": true
      }
    }
  }