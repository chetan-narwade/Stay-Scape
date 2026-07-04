FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN node app.js

COPY . .

EXPOSE 8080

CMD ["node", "app.js"]
