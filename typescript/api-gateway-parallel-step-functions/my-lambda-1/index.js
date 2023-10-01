async function main(event) {
  try {
    return {
      body: JSON.stringify({
        message: 'Hello World!',
      }),
      statusCode: 200,
    };
  } catch (error) {
    return { body: JSON.stringify({ error }) }
  }
}

module.exports = { main }
