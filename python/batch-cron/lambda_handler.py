def lambda_handler(event, context):
    print("I'm running!")

    return {
        'is_holiday' : False
    }
