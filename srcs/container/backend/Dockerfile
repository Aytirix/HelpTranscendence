# Utiliser une image officielle Node.js
FROM node:18-slim

RUN apt-get update && apt-get install -y \
	git \
	zsh \
	net-tools \
	bash

# Creer le fichier de configuration pour sqlite
RUN mkdir -p /var/lib/sqlite
RUN touch /var/lib/sqlite/db.sqlite

# Copier les fichiers de l'application
COPY api/ .
RUN chmod +x ./start.sh

# Démarrer l'api

ENTRYPOINT ["/bin/bash", "./start.sh"]