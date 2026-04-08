FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["node_modules/.bin/next", "dev", "--hostname", "0.0.0.0"]
