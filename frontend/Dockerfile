FROM node:20-alpine AS base

WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Create startup script that logs version
RUN echo '#!/bin/sh' > /startup.sh && \
    echo 'echo "=== Contracts Frontend v1.0.87 starting ==="' >> /startup.sh && \
    echo 'echo "Frontend version: 1.0.87"' >> /startup.sh && \
    echo 'nginx -g "daemon off;"' >> /startup.sh && \
    chmod +x /startup.sh

CMD ["/startup.sh"]
