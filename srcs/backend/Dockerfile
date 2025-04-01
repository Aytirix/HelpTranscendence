# Utiliser une image officielle Node.js
FROM node:18

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

# Définir le répertoire de travail
WORKDIR /var/www/html/backend

# Copier les fichiers de l'application
COPY api/ .

RUN npm install

# Installer les dépendances de développement
RUN npm install -g ts-node ts-node-dev

EXPOSE 7000

# Démarrer l'application avec PM2
# CMD ["pm2-runtime", "start", "server.js"]
CMD ["npm", "run", "watch"]
# CMD ["sleep", "infinity"]