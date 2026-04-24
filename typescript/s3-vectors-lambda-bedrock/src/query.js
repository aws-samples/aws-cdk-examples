const { S3VectorsClient, QueryVectorsCommand } = require("@aws-sdk/client-s3vectors");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const s3v = new S3VectorsClient();
const bedrock = new BedrockRuntimeClient();

const VECTOR_BUCKET = process.env.VECTOR_BUCKET_NAME;
const INDEX_NAME = process.env.INDEX_NAME;
const EMBED_MODEL = process.env.EMBED_MODEL_ID;
const GEN_MODEL = process.env.GENERATION_MODEL_ID;

async function embed(text) {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: EMBED_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text }),
    })
  );
  return JSON.parse(new TextDecoder().decode(res.body)).embedding;
}

exports.handler = async (event) => {
  const question = event.question;
  if (!question) return { statusCode: 400, body: "No question provided" };

  // Embed the question
  const queryVector = await embed(question);

  // Search S3 Vectors for similar documents
  const searchResult = await s3v.send(
    new QueryVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: INDEX_NAME,
      queryVector: { float32: queryVector },
      topK: 3,
      returnMetadata: true,
      returnDistance: true,
    })
  );

  const context = (searchResult.vectors || [])
    .map((v) => v.metadata?.source_text || "")
    .filter(Boolean)
    .join("\n\n");

  // Generate answer using retrieved context
  const genRes = await bedrock.send(
    new InvokeModelCommand({
      modelId: GEN_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Answer the question based on the context below. If the context doesn't contain the answer, say so.\n\nContext:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
    })
  );

  const answer = JSON.parse(new TextDecoder().decode(genRes.body)).content[0].text;

  return {
    statusCode: 200,
    body: JSON.stringify({
      question,
      answer,
      sources: (searchResult.vectors || []).map((v) => ({
        key: v.key,
        distance: v.distance,
      })),
    }),
  };
};
