import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error(error);
    throw new Error('Erreur lors du hachage du mot de passe');
  }
}

export default {
	  hashPassword,
};