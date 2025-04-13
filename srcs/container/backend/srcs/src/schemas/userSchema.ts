import { messageResponse } from './common';

export const login = {
	description: "Connexion utilisateur. Tant qu'il a un cookie sessionId coté client, il peut être considéré comme connecté.",
	tags: ['auth'],
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
				email: 'error.email.invalid',
				password: 'error.password.invalid',
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
	tags: ['auth'],
	body: {
		properties: {
			...login.body.properties,
			username: { type: 'string', minLength: 3, maxLength: 15, pattern: '^[a-zA-Z0-9]+$' },
			confirmPassword: { type: 'string', minLength: 3 },
			// confirmPassword: { type: 'string', minLength: 8, maxLength: 25, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,25}$' },
			lang: { type: 'string', enum: ['FR', 'EN', 'JP'] },
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
				confirmPassword: 'errors.password.notMatching',
				lang: 'errors.lang.invalid',
			},
		}
	},
}

export const logout = {
	description: 'Déconnexion utilisateur',
	tags: ['auth'],
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
	logout,
};