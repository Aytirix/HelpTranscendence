import { messageResponse } from './common';
import i18n from '@i18n';

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
				email: i18n.t('login.failed'),
				password: i18n.t('login.failed'),
			},
			properties: {
				email: i18n.t('error.email.invalid'),
				password: i18n.t('error.password.invalid'),
			},
			additionalProperties: 'Des propriétés supplémentaires ne sont pas autorisées.',
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
				...login.body.errorMessage.required,
				username: i18n.t('errors.username.required'),
				confirmPassword: i18n.t('errors.password.required'),
				lang: i18n.t('errors.lang.required'),
			},
			properties: {
				...login.body.errorMessage.properties,
				username: i18n.t('errors.username.invalid'),
				confirmPassword: i18n.t('errors.password.notMatching'),
				lang: i18n.t('errors.lang.invalid'),
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