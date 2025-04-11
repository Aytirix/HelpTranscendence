export const userSchema = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		email: { type: 'string', format: 'email' }
	},
	required: ['name', 'email'],
	additionalProperties: false
};
