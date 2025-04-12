import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

i18next.use(Backend).init({
  fallbackLng: 'fr',
  preload: ['fr', 'en', 'jp'],
  backend: {
    loadPath: __dirname + '/locales/{{lng}}/translation.json'
  },
  debug: false,
  missingKeyHandler: (lng, namespace, key, res) => {
	console.error(`path: ${__dirname + '/src/locales/' + lng + '/translation.json'}`);
    console.error(`Clé manquante : ${key} pour la langue ${lng}`);
  },
  detection: {
	order: ['cookie', 'header'],
	caches: ['cookie'],
  },
});

export default i18next;
