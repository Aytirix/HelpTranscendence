import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(__dirname, '/var/lib/sqlite/db.sqlite'), {
	// 'verbose' active l'affichage des requêtes SQL dans la console pour faciliter le débogage.
	// Cela affiche chaque requête SQL exécutée, ce qui peut être très utile pour suivre l'exécution des requêtes et vérifier les erreurs.
	verbose: console.log,

	fileMustExist: true, // Si vous voulez obliger l'existence du fichier avant d'ouvrir la base de données.

	// 'timeout' définit combien de temps SQLite doit attendre avant de lancer une erreur si une opération est en attente.
	// Ceci est utile pour éviter que l'application se bloque en cas de conflits de verrouillage.
	timeout: 5000, // Temps d'attente de 5000 ms (5 secondes).
});

// const createTableSQL = `
//   CREATE TABLE IF NOT EXISTS users (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     username TEXT NOT NULL UNIQUE,
//     email TEXT NOT NULL UNIQUE,
//     password TEXT NOT NULL,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//   );
// `;

// // Exécute la requête SQL
// db.prepare(createTableSQL).run();


// const insert = `
//   INSERT INTO users (username, email, password)
//   VALUES (?, ?, ?);
// `;
// const stmt = db.prepare(insert);

// const users = [
// 	{ username: 'john_doe', email: 'john@example.com', password: 'password123' },
// 	{ username: 'jane_doe', email: 'jane@example.com', password: 'securepassword' },
// ];

// users.forEach(user => {
// 	stmt.run(user.username, user.email, user.password);
// });

// Exportation de l'instance de la base de données pour l'utiliser ailleurs dans le code
export default db;


