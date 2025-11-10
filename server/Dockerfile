FROM node:20-alpine

WORKDIR /app

# Install Puppeteer dependencies for google-news-scraper
RUN apk add --no-cache \
    chromium \
    ca-certificates

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json package-lock.json* ./

RUN npm ci

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
