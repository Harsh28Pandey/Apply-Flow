# Multi-stage production build for CareerMail Pro
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY server ./server
COPY client ./client

# Build React client bundle
RUN cd client && npm run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root & server package files
COPY package.json ./
COPY server/package.json ./server/

# Install production dependencies only
RUN cd server && npm install --omit=dev

# Copy server code and built client assets
COPY server/src ./server/src
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/src/index.js"]
