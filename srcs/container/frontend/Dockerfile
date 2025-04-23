# Utiliser une image officielle Node.js
FROM node:20-slim

RUN apt-get update && apt-get install -y \
	git \
	zsh \
	net-tools \
	bash \
	&& rm -rf /var/lib/apt/lists/*

# Copier les fichiers de l'application
COPY srcs/ .
RUN chmod +x ./config/start.sh

ENTRYPOINT ["/bin/bash", "./config/start.sh"]