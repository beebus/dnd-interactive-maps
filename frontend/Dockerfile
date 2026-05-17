FROM node:26

WORKDIR /app
COPY . .
RUN npm install --include=dev
CMD ["npm", "run", "dev"]
