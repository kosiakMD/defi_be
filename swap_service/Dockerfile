FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --loglevel verbose

COPY . .

RUN ls -l

RUN npm run build

ENV SERVICE_PORT 3002

EXPOSE 3002

HEALTHCHECK --interval=60s --timeout=2s --start-period=30s --retries=2 \
    CMD node healthcheck.js

CMD [ "npm", "run", "start" ]
