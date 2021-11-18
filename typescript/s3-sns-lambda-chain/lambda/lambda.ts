export const handler = async (event: any = {}): Promise<any> => {
  // output event to logs
  console.log("request:", JSON.stringify(event, undefined, 2));

  // return response back to upstream caller
  return {
    'statusCode': 200,
    'body': event
  };
};