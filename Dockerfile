# Use latest version of Node as the base image
FROM node:latest

# Copy everything in the current directory to our image, in the 'app' folder
COPY . /app

# Install dependencies
RUN cd /app; \
npm install --production

# Expose server port
EXPOSE 3000

# Run node
CMD ["node", "/app/src/server.js"]