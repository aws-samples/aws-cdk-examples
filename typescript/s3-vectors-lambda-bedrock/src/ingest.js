const { S3VectorsClient, PutVectorsCommand } = require("@aws-sdk/client-s3vectors");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const s3v = new S3VectorsClient();
const bedrock = new BedrockRuntimeClient();

const VECTOR_BUCKET = process.env.VECTOR_BUCKET_NAME;
const INDEX_NAME = process.env.INDEX_NAME;
const EMBED_MODEL = process.env.EMBED_MODEL_ID;

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
  const documents = event.documents || [];
  if (!documents.length) return { statusCode: 400, body: "No documents provided" };

  // Generate embeddings for all documents
  const vectors = [];
  for (const doc of documents) {
    const embedding = await embed(doc.text);
    vectors.push({
      key: doc.key,
      data: { float32: embedding },
      metadata: {
        source_text: doc.text,
        ingested_at: new Date().toISOString(),
        ...(doc.metadata || {}),
      },
    });
  }

  // Batch put into S3 Vectors
  await s3v.send(
    new PutVectorsCommand({
      vectorBucketName: VECTOR_BUCKET,
      indexName: INDEX_NAME,
      vectors,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ ingested: vectors.length }),
  };
};
