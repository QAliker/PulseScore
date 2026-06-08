FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx prisma generate

# --- Dev (docker-compose) ---
FROM base AS dev
EXPOSE 3001
CMD ["sleep", "infinity"]

# --- Prod build (Fly.io) ---
FROM base AS build
RUN npm run build

# --- Prod runtime ---
FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
