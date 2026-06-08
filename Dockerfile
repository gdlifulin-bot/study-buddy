FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./

RUN npm install

COPY server/ .

ENV DB_DIR=/data
ENV NODE_ENV=production

RUN mkdir -p /data

EXPOSE 3001

CMD ["node", "index.js"]
