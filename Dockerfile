# Use latest version of Node as the base image
FROM node:7.3.0

# Copy everything in the current directory to our image, in the 'app' folder
COPY . /app

# Install dependencies
RUN cd /app; \
npm install --production

# Expose server port
EXPOSE 3001

# Run node
CMD ["node", "/app/index.js"]