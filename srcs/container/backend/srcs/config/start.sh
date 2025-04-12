# Installer globalement
npm install -g typescript ts-node ts-node-dev pm2 fastify

# Installer les dépendances
npm install

# démarrer le serveur
echo "Starting the server... to $NODE_PROJET"
if [ "$NODE_PROJET" = "production" ]; then
	tsc --project tsconfig.json
	npm run prod
else
	npm run dev
fi