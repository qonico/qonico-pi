FROM node:12

WORKDIR /usr/src/app
ENV REST_SERVER host.docker.internal

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001/tcp

CMD node dist/index.js