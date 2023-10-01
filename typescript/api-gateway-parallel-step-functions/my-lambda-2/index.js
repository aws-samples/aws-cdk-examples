async function main(event) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return {
      body: JSON.stringify({
        message: 'Hello World zzZ! (Sleepy)',
      }),
      statusCode: 200,
    };
  } catch (error) {
    return { body: JSON.stringify({ error }) }
  }
}

module.exports = { main }
