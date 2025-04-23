# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app runs on (adjust according to your .env PORT variable)
EXPOSE 3003

# Start the application
CMD ["npm", "start"]
