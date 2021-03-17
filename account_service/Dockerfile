FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --loglevel verbose

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "node", "dist/main.js" ]
