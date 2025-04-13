import { messageResponse } from './common';

export const login = {
	description: "Connexion utilisateur. Tant qu'il a un cookie sessionId coté client, il peut être considéré comme connecté.",
	tags: ['user'],
	body: {
		type: 'object',
		properties: {
			email: { type: 'string', minLength: 3, maxLength: 50 },
			password: { type: 'string', minLength: 3 },
			// password: { type: 'string', minLength: 8, maxLength: 25, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,25}$' },
		},
		required: ['email', 'password'],
		additionalProperties: false,
		errorMessage: {
			required: {
				email: 'login.failed',
				password: 'login.failed',
			},
			properties: {
				email: 'errors.email.invalid',
				password: 'errors.password.invalid',
			},
			additionalProperties: 'errors.NoadditionalProperties',
		}
	},
	response: {
		200: {
			description: 'Authentification réussie',
			...messageResponse,
		},
		400: {
			description: 'Format des données incorrect',
			...messageResponse,
		},
		401: {
			description: 'Erreur d\'authentification',
			...messageResponse,
		},
	},
};

export const register = {
	...login,
	description: 'Inscription utilisateur',
	tags: ['user'],
	body: {
		properties: {
			...login.body.properties,
			email: { type: 'string', minLength: 3, maxLength: 50, format: 'email' },
			username: { type: 'string', minLength: 3, maxLength: 15, pattern: '^[a-zA-Z0-9]+$' },
			confirmPassword: { type: 'string', minLength: 3 },
			// confirmPassword: { type: 'string', minLength: 8, maxLength: 25, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,25}$' },
			lang: { type: 'string', enum: ['fr', 'en', 'jp'] },
		},
		required: [...login.body.required, 'username', 'confirmPassword'],
		errorMessage: {
			required: {
				email: 'errors.email.required',
				password: 'errors.password.required',
				username: 'errors.username.required',
				confirmPassword: 'errors.password.required',
				lang: 'errors.lang.required',
			},
			properties: {
				...login.body.errorMessage.properties,
				username: 'errors.username.invalid',
				confirmPassword: 'errors.password.invalid',
				lang: 'errors.lang.invalid',
			},
		}
	},
}

export const update = {
	...register,
	description: 'Mise à jour utilisateur. Aucun champ n\'est requis, mais au moins un doit être présent.',
	tags: ['user'],
	body: {
		properties: {
			...register.body.properties,
		},
		errorMessage: {
			properties: {
				...register.body.errorMessage.properties,
			},
		}
	},
}

export const logout = {
	description: 'Déconnexion utilisateur',
	tags: ['user'],
	response: {
		200: {
			description: 'Déconnexion réussie',
			...messageResponse,
		}
	},
}

export default {
	login,
	register,
	update,
	logout,
};