# Utiliser une image officielle Node.js
FROM node:18-slim

RUN apt-get update && apt-get install -y \
	git \
	zsh \
	net-tools \
	bash \
	tzdata \
	psmisc \
	&& rm -rf /var/lib/apt/lists/*

RUN ln -fs /usr/share/zoneinfo/Europe/Paris /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

# Copier les fichiers de l'application
COPY srcs/ .
RUN chmod +x ./config/start.sh

ENTRYPOINT ["/bin/bash", "./config/start.sh"]