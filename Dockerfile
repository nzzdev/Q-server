# Use latest version of Node as the base image
FROM node:7.3.0

# Set work directory for run/cmd 
WORKDIR /app

# Copy package.json into work directory and install dependencies
COPY package.json /app/package.json
RUN npm install

# Build variable for setting app environment
ARG APP_ENV
ENV APP_ENV ${APP_ENV}

# Copy everything else to work directory
COPY ./ /app

# Expose server port
EXPOSE 3001

# Run node app with env variable
CMD npm run start:${APP_ENV}