FROM node:20-bullseye-slim

# Installe openssl 1.1 requis par Prisma
RUN apt-get update && apt-get install -y openssl libssl1.1 --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
