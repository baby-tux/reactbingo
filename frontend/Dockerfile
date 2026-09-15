# Build stage: compile the CRA app
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY public ./public
COPY src ./src
RUN npm run build

# Runtime stage: serve the static build with nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
