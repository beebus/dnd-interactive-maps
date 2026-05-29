FROM node:26

WORKDIR /app

RUN npm install -g npm@latest

COPY . .
RUN npm install --include=dev
CMD ["npm", "run", "dev"]
