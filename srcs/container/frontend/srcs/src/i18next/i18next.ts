import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const missingKeys = new Set();

i18n
	.use(HttpBackend)
	.use(initReactI18next)
	.init({
		lng: 'fr',
		keySeparator: false,
		debug: false,
		interpolation: {
			escapeValue: false,
		},
		backend: {
			loadPath: '/locales/{{lng}}/translation_frontend.json',
		},
		returnNull: false,
		returnEmptyString: false,
		parseMissingKeyHandler: (key: string) => {
			if (missingKeys.has(key)) return key;
			missingKeys.add(key);
			const lang = i18n.language;
			console.error(`🔑 Clé manquante dans [${lang}]: ${key}`);
			return key;
		},
	});

export default i18n;
