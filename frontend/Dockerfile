# Build stage: bundle the app with Vite
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY index.html vite.config.ts tsconfig.json eslint.config.js ./
COPY public ./public
COPY src ./src
# A lint error or failing test stops the image build
RUN npm run lint && npm test -- --run && npm run build

# Runtime stage: serve the static build with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
