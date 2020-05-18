FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001/tcp

CMD node dist/index.js