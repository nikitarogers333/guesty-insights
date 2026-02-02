FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Build for production
RUN npm run build

# For development
CMD ["npm", "run", "dev", "--", "--host"]
