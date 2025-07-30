# Uses node:20 as the base image
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy the rest of the application code
COPY . .

# Build the application for production
RUN npm run build:prod

# Debug: List what was built
RUN ls -la dist/
RUN ls -la dist/callbook-front/ || echo "callbook-front directory not found"

# Use nginx to serve the built application
FROM nginx:alpine

# Copy the built application from the build stage
COPY --from=build /app/dist/callbook-front/browser /usr/share/nginx/html

# Debug: Check what files are copied
RUN ls -la /usr/share/nginx/html/

# Remove default nginx config and create custom one
RUN rm /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/nginx.conf

# Create custom nginx configuration
RUN echo 'events { \
    worker_connections 1024; \
} \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    server { \
        listen 4200; \
        server_name localhost; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
            expires 1y; \
            add_header Cache-Control "public, immutable"; \
        } \
        location = /index.html { \
            add_header Cache-Control "no-cache, no-store, must-revalidate"; \
            add_header Pragma "no-cache"; \
            add_header Expires "0"; \
        } \
    } \
}' > /etc/nginx/nginx.conf

# Expose the port the app runs on
EXPOSE 4200

# Start nginx
CMD ["nginx", "-g", "daemon off;"]