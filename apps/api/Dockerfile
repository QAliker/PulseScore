FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx prisma generate

FROM base AS dev
EXPOSE 3001
CMD ["sleep", "infinity"]

# FROM base AS prod
# RUN npm run build
# EXPOSE 3001
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
