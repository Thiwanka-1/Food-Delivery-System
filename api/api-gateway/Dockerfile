# Use the official NGINX Alpine base image
FROM nginx:alpine

# Copy our custom NGINX configuration into the image
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (this is the port nginx listens on inside the container)
EXPOSE 80

# Start nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
