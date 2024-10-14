FROM node:20.18.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD [ "node", "src/router/server.js" ]
