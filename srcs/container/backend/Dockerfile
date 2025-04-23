# Utiliser une image officielle Node.js
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    git \
    zsh \
    net-tools \
    bash \
    && rm -rf /var/lib/apt/lists/*

RUN ln -snf /usr/share/zoneinfo/Europe/Paris /etc/localtime && \
    echo "Europe/Paris" > /etc/timezone

RUN mkdir -p /var/lib/sqlite && touch /var/lib/sqlite/db.sqlite

COPY srcs/ .

RUN chmod +x ./config/start.sh

ENTRYPOINT ["/bin/bash", "./config/start.sh"]
