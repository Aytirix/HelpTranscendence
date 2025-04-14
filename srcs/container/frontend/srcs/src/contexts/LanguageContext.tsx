import i18n from '../i18next/i18next';
import { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext<any>(null);

export const LanguageProvider = ({ children }: any) => {
	const { t } = useTranslation();

	const setLanguage = (lang: string) => i18n.changeLanguage(lang);

	return (
		<LanguageContext.Provider value={{ t, setLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
};

export const useLanguage = () => useContext(LanguageContext);
