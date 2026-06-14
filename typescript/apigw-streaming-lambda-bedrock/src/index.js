const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient();
const MODEL_ID = process.env.MODEL_ID;

exports.handler = awslambda.streamifyResponse(async (event, responseStream, _context) => {
  const body = JSON.parse(event.body || "{}");
  const prompt = body.prompt || "Hello";

  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });

  try {
    const response = await client.send(
      new InvokeModelWithResponseStreamCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      })
    );

    for await (const event of response.body) {
      if (event.chunk) {
        const parsed = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          responseStream.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
        }
      }
    }
    responseStream.write("data: [DONE]\n\n");
  } catch (err) {
    responseStream.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  responseStream.end();
});
