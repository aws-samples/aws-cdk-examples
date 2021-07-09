// Pretty basic Hello World lambda...

export const handler = async (event: any = {}) : Promise <any> => {
  console.log(event);

  return { statusCode: 201, body: 'Hello world!' };
};
