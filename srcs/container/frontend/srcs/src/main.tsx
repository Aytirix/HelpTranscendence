import './i18next/i18next';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './AppRouter';

import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<LanguageProvider>
			<BrowserRouter>
				<AppRouter />
			</BrowserRouter>
		</LanguageProvider>
	</StrictMode>
);
