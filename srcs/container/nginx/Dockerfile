FROM alpine:3.16

# Variables d'environnement
ARG NODE_PROJET
ARG FRONTEND_PATH

# Installer nginx et openssl
RUN apk update && apk add --no-cache nginx openssl gettext

# Copier le fichier de configuration principal dans /etc/nginx/
COPY conf/nginx.conf.template /etc/nginx/nginx.conf.template

# Copier tout les .conf dans /etc/nginx/conf.d/ sauf le fichier default.conf
COPY conf/*.conf /etc/nginx/conf.d/

EXPOSE 443

RUN echo "nginx configuration generated with NODE_PROJET='${NODE_PROJET}'"
RUN echo "nginx configuration generated with FRONTEND_PATH='${FRONTEND_PATH}'"
RUN envsubst '$NODE_PROJET' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]
