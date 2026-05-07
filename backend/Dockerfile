FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci && cp -R node_modules /opt/node_modules

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY . .

EXPOSE 3333

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
