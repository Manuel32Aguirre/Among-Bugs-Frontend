FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4200
ENV CHOKIDAR_USEPOLLING=true

CMD ["sh", "-c", "node scripts/generate-env.mjs && ng serve --host 0.0.0.0 --poll 2000"]
