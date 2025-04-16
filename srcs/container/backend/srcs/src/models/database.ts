import path from 'path';
import { Connection } from 'mysql2';
const mysql = require('mysql2');
require('dotenv').config();


/**
 * Crée une connexion à la base de données MySQL en utilisant les informations
 * de connexion fournies dans les variables d'environnement.
 *
 * @returns {Promise<mysql.Connection>} Une promesse qui se résout avec l'objet
 * de connexion MySQL si la connexion réussit, ou qui est rejetée avec une erreur
 * en cas d'échec.
 *
 * @throws {Error} Si la connexion échoue, une erreur spécifique est rejetée :
 * - `ETIMEDOUT` : La base de données ne répond pas. Vérifiez les informations de connexion.
 * - `ER_ACCESS_DENIED_ERROR` : Identifiant ou mot de passe incorrect.
 * - `ER_DBACCESS_DENIED_ERROR` : Accès refusé à la base de données.
 * - Toute autre erreur renvoyée par MySQL.
 */
async function createDbConnection() {
	return new Promise((resolve, reject) => {
		const db = mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
		});

		db.connect((err: { code: string; }) => {
			if (err) {
				// Si timeout, renvoyer une erreur
				if (err.code === 'ETIMEDOUT') {
					reject(new Error('La base de données ne répond pas. Veuillez vérifier les informations de connexion.'));
				} else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
					reject(new Error('L\'identifiant ou le mot de passe de la base de données est incorrect.'));
				} else if (err.code === 'ER_DBACCESS_DENIED_ERROR') {
					reject(new Error('Accès refusé à la base de données.'));
				} else {
					reject(err);
				}
			} else {
				resolve(db);
			}
		});
	});
}

/**
 * Ferme la connexion à la base de données si elle est active.
 *
 * @param db - La connexion à la base de données à fermer. Peut être `null`.
 * @returns Une promesse résolue une fois la tentative de fermeture terminée.
 * @remarks
 * Si une erreur survient lors de la fermeture de la connexion, elle sera
 * affichée dans la console avec un message d'erreur.
 */
async function closeDbConnection(db: Connection | null) {
	if (db) {
		db.end((err: Error | null) => {
			if (err) {
				console.error("Erreur lors de la fermeture de la connexion à la base de données:", err);
			}
		});
	}
}

/**
 * Exécute une requête SQL sur la base de données.
 *
 * @param req - La requête SQL à exécuter sous forme de chaîne de caractères.
 * @param data - Un tableau de chaînes de caractères représentant les données à injecter dans la requête SQL (par défaut vide).
 * @returns Une promesse qui se résout avec les résultats de la requête ou se rejette avec un message d'erreur SQL.
 *
 * @throws Une erreur si la connexion à la base de données échoue ou si la requête SQL échoue.
 *
 * @remarks
 * Cette fonction établit une connexion à la base de données, exécute la requête SQL, puis ferme la connexion, même en cas d'erreur.
 */
async function executeReq(req: string, data: Array<string | number> = []) {
	let db = null;
	return new Promise(async (resolve, reject) => {
		try {
			db = await createDbConnection();
			db.query(req, data, (err: { sqlMessage: any; }, results: unknown) => {
				if (err) {
					reject(err.sqlMessage);
				} else {
					resolve(results);
				}
			});
		} catch (error) {
			reject(error);
		}
	}).finally(async () => {
		await closeDbConnection(db);
	});
}

export { executeReq, createDbConnection, closeDbConnection };
export default executeReq;