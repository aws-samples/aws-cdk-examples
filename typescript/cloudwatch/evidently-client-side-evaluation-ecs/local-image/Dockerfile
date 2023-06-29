FROM node:alpine

WORKDIR /app

COPY . /app

RUN npm install && npm install typescript -g && tsc

EXPOSE 80

CMD ["node", "app.js"]
