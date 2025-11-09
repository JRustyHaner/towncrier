FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci && npx expo install

COPY . .

EXPOSE 8081

CMD ["npm", "start", "--", "--tunnel"]
