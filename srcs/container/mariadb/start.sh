#!/bin/sh

# Vérifier si la base de données est déjà initialisée
if [ ! -d "/var/lib/mysql/mysql" ]; then
    mysql_install_db --user=mysql --datadir=/var/lib/mysql
fi

# Vérifier si le mot de passe root est déjà défini et si la base existe
if [ ! -d "/var/lib/mysql/${WP_DB_NAME}" ]; then
    echo "Démarrage temporaire de MariaDB..."
    mysqld_safe --user=mysql --skip-networking --datadir=/var/lib/mysql &

    # Attendre que le serveur soit prêt
    echo "Attente du démarrage de MariaDB..."
    until mysqladmin ping --silent; do
        sleep 2
    done

	mysql -u root <<EOF SOURCE /tmp/init.sql;
EOF

	echo "Arrêt de MariaDB..."
	mysqladmin shutdown --user=root --password="${ROOT_PASSWORD}"
	sleep 2
fi

echo "Démarrage final de MariaDB..."
exec mysqld --user=mysql --datadir=/var/lib/mysql