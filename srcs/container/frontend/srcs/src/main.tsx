import './i18next/i18next';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/AppRouter.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<BrowserRouter>
		<AuthProvider>
			<LanguageProvider>
				<AppRouter />
			</LanguageProvider>
		</AuthProvider>
	</BrowserRouter>
);
