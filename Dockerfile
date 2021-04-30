FROM node:14 as development

# Install development dependencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --loglevel verbose

# Build application
COPY . .
RUN npm run build

# Configure application startup command
CMD ["npm", "run", "start"]



FROM node:14 as pre-production

# Install runtime dependencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production



FROM node:14-alpine as production

# Setup default environment variables
ENV NODE_ENV production

# Copy runtime dependencies and application code
WORKDIR /usr/src/app
RUN touch .env
COPY --from=pre-production /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist

# Configure application startup command
ENTRYPOINT ["node"]
CMD ["dist/main"]