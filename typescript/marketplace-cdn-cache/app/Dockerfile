FROM public.ecr.aws/docker/library/node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
USER node
EXPOSE 8080
CMD ["node", "server.js"]
