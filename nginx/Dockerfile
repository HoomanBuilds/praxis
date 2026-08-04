# PRAXIS reverse proxy — nginx with SSL termination
FROM nginx:1.27-alpine

# Install certbot for Let's Encrypt
RUN apk add --no-cache certbot

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["sh", "-c", "nginx -g 'daemon off;'"]
