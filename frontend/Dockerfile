# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Add package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage - using Node instead of nginx for simplicity
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built app from the build stage
COPY --from=build /app/build ./build
COPY --from=build /app/start.sh ./start.sh
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

# Make start script executable
RUN chmod +x start.sh

# Expose port based on environment or default to 3000
EXPOSE ${PORT:-3000}

# Start serve using our start script
CMD ["./start.sh"]
