FROM node:20-alpine

WORKDIR /app

# Install dependencies required for Prisma Client (OpenSSL)
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
