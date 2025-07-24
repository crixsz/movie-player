# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Stage 2: Serve the application with a lightweight web server
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/dist ./dist

# Install serve globally
RUN npm install -g serve

# Expose the port 8118
EXPOSE 8118

# Command to run the application
CMD ["serve", "-s", "dist", "-l", "8118"]