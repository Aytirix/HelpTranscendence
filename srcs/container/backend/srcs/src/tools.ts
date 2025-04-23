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

export function mapToObject<T>(map: Map<number, T>): Record<number, T> {
	const obj: Record<number, T> = {};
	for (const [key, value] of map.entries()) {
		obj[key] = value;
	}
	return obj;
}

export function mapToArray<T>(map: Map<number, T>): T[] {
	return Array.from(map.values());
}

export default {
	  hashPassword,
	  mapToObject,
	  mapToArray,
};