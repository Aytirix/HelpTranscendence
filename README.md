# Transcendence - Projet Ecole 42

Ce projet, réalisé dans le cadre du cursus de l'École 42, a pour objectif de développer une application de jeu en ligne. Le projet est conçu pour être une plateforme de jeu où les utilisateurs peuvent s'affronter dans des jeux variés, tout en offrant une interface utilisateur intuitive et agréable.



## Base de donnees
Pour l'instant on va utiliser la base de donnees sur mon serveur.
  - url      : [Cliquez ici](https://phpmyadmin.theomouty.fr/)
  - user     : ```user_transcendence```
  - password : ```*NYwDqpPBEEBETti```

## Table des matières

- [Docs](#Docs)
- [Installation](#installation)
- [Lancement de l'application](#lancement-de-lapplication)
- [Fonctionnalités](#fonctionnalités)
- [Structure de la base de données](#structure-de-la-base-de-données)

## Docs
L'api est documentée avec Swagger. Vous pouvez y accéder à l'adresse suivante : [https://localhost:7000/docs](https://localhost:7000/docs)

## Installation
Clonez le dépôt :
```bash
git clone git@github.com:Aytirix/transcendence.git
cd transcendence
```

Installation de Docker :
```bash
sudo apt-get install docker.io docker-compose
```

Si vous n'avez pas encore installé NVM (gestionnaire de version de Node.js), vous pouvez le faire en exécutant la commande suivante :
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc
source ~/.nvm/nvm.sh
source ~/.zshrc
```

Ensuite, installez la version de Node.js requise par le projet :
```bash
nvm install 22.9.0
nvm use 22.9.0
```
Installez les dépendances du projet :
```bash
npm install
```

## Lancement de l'application
Cela va lancer les conteneurs Docker nécessaires à l'application. Vous pouvez ensuite accéder à l'application via votre navigateur à l'adresse suivante : [https://localhost:3000](https://localhost:3000) :
```bash
make
```

Lancer l'application si elle a déjà été compilée :
```bash
make start
```

Arrêter l'application et les conteneurs Docker :
```bash
make stop
```

## Fonctionnalités
- Inscription et connexion des utilisateurs
- Connexion avec son compte Google
- Connexion avec l'API de 42
- Gestion des amis, invitations et blocages
- Chat amis et possibilité de créer des groupes
- Jeu pong et système de matchmaking