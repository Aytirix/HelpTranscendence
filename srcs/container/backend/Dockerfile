# Utiliser une image officielle Node.js
FROM node:18-slim

RUN apt-get update && apt-get install -y \
	git \
	zsh \
	net-tools

# Creer le fichier de configuration pour sqlite
RUN mkdir -p /var/lib/sqlite
RUN touch /var/lib/sqlite/db.sqlite

# Installer PM2 globalement
RUN npm install -g pm2
RUN npm install -g fastify

# Copier les fichiers de l'application
COPY api/ .

RUN npm install

# Installer les dépendances de développement
RUN npm install -g ts-node ts-node-dev

# Démarrer l'api
CMD ["npm", "run", "start"]