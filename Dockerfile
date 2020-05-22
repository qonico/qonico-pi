FROM node:12

WORKDIR /usr/src/app
ENV REST_SERVER http://host.docker.internal:1317
ENV USE_RANDOM 1

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001/tcp

CMD node dist/index.js