# Build stage: compile TypeScript
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage: production dependencies and compiled output only
FROM node:26-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --silent && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node
EXPOSE 8999

CMD ["node", "dist/server.js"]
