import { createRoot } from 'react-dom/client';
import ModuleManager from './app/ModuleManager';

import './app/assets/styles/index.css';
import { useEffect } from 'react';

function DisableNativeContextMenu({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			e.preventDefault(); // bloque le menu natif
		};
		window.addEventListener('contextmenu', handler);
		return () => window.removeEventListener('contextmenu', handler);
	}, []);

	return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
	<DisableNativeContextMenu>
		<ModuleManager />
	</DisableNativeContextMenu>
);
