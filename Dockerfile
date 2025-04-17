# Use an official Node.js runtime as a parent image
FROM node:16.17-alpine3.16

ENV NODE_ENV=production

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install application dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . ./

# Command to run the app
CMD [ "node", "server.js" ]
