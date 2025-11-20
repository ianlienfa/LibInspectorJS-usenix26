FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Expose port
EXPOSE 3001

# Run the server
CMD ["node", "server.js"]
