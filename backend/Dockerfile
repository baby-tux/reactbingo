# pull official base image
FROM node:alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json tsconfig.json ./
RUN npm install --silent

# add app
COPY src ./src

RUN node_modules/typescript/bin/tsc -p /app

# start app
CMD ["node", "/app/dist/server.js"]
