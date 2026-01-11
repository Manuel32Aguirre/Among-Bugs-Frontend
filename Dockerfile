FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git

COPY package*.json ./

RUN npm cache clean --force
RUN npm install
RUN npm install -g @angular/cli

COPY . .

EXPOSE 4200

ENV CHOKIDAR_USEPOLLING=true

CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]