FROM node:20-slim


# puppeteer dependencies + ARM용 chromium 설치
RUN apt-get update && apt-get install -y \
    curl \  
    chromium\
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app



COPY package*.json ./
COPY tsconfig.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install

COPY . .

COPY download-files.sh /download-files.sh
COPY debun.sh /usr/local/bin/debun

# RUN chmod +x /download-files.sh
RUN chmod +x /usr/local/bin/debun
# RUN /download-files.sh
