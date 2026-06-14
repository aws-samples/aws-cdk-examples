const { withDurableExecution } = require("@aws/durable-execution-sdk-js");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient();
const MODEL_ID = process.env.MODEL_ID;

async function callBedrock(prompt) {
  const res = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    })
  );
  return JSON.parse(new TextDecoder().decode(res.body)).content[0].text;
}

exports.handler = withDurableExecution(async (event, context) => {
  const topic = event.topic || "Serverless computing";

  const outline = await context.step(async (stepCtx) => {
    stepCtx.logger.info(`Generating outline for: ${topic}`);
    return callBedrock(`Create a concise blog post outline (5 sections max) about: ${topic}. Return only the outline.`);
  });

  await context.wait({ seconds: 5 });

  const draft = await context.step(async (stepCtx) => {
    stepCtx.logger.info("Expanding outline into draft");
    return callBedrock(`Expand this outline into a short blog draft (under 500 words):\n\n${outline}`);
  });

  const summary = await context.step(async (stepCtx) => {
    stepCtx.logger.info("Generating summary");
    return callBedrock(`Summarize this blog post in 2-3 sentences:\n\n${draft}`);
  });

  return { topic, outline, draft, summary };
});
