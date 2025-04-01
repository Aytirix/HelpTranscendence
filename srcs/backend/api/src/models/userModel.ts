import db from './database';

interface User {
  id: number;
  name: string;
  email: string;
}

export const getUsers = (): User[] => {
  return db.prepare('SELECT * FROM users').all();
};

export const createUser = (user: { name: string, email: string }): User => {
  const { name, email } = user;
  const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return { id: result.lastInsertRowid, name, email };
};
