FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p /storage/clients /storage/cache

EXPOSE 4002

CMD ["node", "src/index.js"]
