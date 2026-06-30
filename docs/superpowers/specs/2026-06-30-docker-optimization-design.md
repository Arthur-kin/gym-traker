# Docker Build Optimization Design

## Goal
Improve Docker build times, prevent local files pollution in Docker contexts, and ensure consistent package versions by using `.dockerignore` files and the `npm ci` command.

## Architecture
1. **Context Filtering**: Implement `.dockerignore` files in both backend and frontend directories to prevent bloated directory copies.
2. **Deterministic Installs**: Switch the `npm install` instruction to `npm ci` in both Dockerfiles to secure identical dependency packages across build stages.

---

## Detailed Specifications

### 1. `.dockerignore` Files
Add identical `.dockerignore` files to both `/backend/` and `/frontend/` root folders:
```
node_modules
dist
build
.env
.env.*
*.log
.git
.gitignore
.dockerignore
```

### 2. Backend Dockerfile Changes
Modify `/backend/Dockerfile`:
```dockerfile
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npm start"]
```

### 3. Frontend Dockerfile Changes
Modify `/frontend/Dockerfile`:
```dockerfile
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8085

CMD ["nginx", "-g", "daemon off;"]
```
