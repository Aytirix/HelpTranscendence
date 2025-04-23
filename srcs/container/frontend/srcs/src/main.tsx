import './i18next/i18next';
import { createRoot } from 'react-dom/client';
import SingletonGuard from './app/components/SingleWindowGuard.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './app/AppRouter.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<SingletonGuard>
		<BrowserRouter>
			<AuthProvider>
				<LanguageProvider>
					<AppRouter />
				</LanguageProvider>
			</AuthProvider>
		</BrowserRouter>
	</SingletonGuard>,
);
