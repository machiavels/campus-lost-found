FROM node:20-alpine

WORKDIR /app

# Installe les dépendances en premier (cache Docker)
COPY package*.json ./
RUN npm install

# Copie le reste du code
COPY . .

# Génère le client Prisma
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
