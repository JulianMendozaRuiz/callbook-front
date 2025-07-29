# Uses node:18 as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
ENV PORT=4200
EXPOSE 4200

# Start the application
CMD ["npm", "start", "--", "--host", "0.0.0.0"]