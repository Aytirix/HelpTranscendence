import React, { useState, useEffect, ReactNode } from 'react';

const CHANNEL_NAME = 'Trascendence';
type Message = { type: 'HELLO' } | { type: 'OCCUPIED' };

interface SingletonGuardProps {
	children?: ReactNode;
}

const SingletonGuard: React.FC<SingletonGuardProps> = ({ children }) => {
	const [isOnlyInstance, setIsOnlyInstance] = useState<boolean | null>(null);

	useEffect(() => {
		const channel = new BroadcastChannel(CHANNEL_NAME);
		let localIsOnly = true;

		// Annonce initiale
		channel.postMessage({ type: 'HELLO' } as Message);

		channel.onmessage = (ev: MessageEvent<Message>) => {
			if (ev.data.type === 'HELLO') {
				// On ne répond QUE si on est encore « only »
				if (localIsOnly) {
					channel.postMessage({ type: 'OCCUPIED' });
				}
			}
			else if (ev.data.type === 'OCCUPIED') {
				// On sait qu’il existe déjà une instance
				localIsOnly = false;
				setIsOnlyInstance(false);
			}
		};

		// Si personne ne répond sous 200ms => on est seul
		const to = setTimeout(() => setIsOnlyInstance(localIsOnly), 100);

		return () => {
			clearTimeout(to);
			channel.close();
		};
	}, []);

	if (isOnlyInstance === null) {
		return (<div></div>);
	}

	if (!isOnlyInstance) {
		return (
			<div className="h-screen flex items-center justify-center bg-red-50">
				<div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm mx-4">
					<h1 className="text-3xl font-extrabold text-red-600 mb-2">Oups !</h1>
					<p className="text-gray-700 mb-6">
						Cette application est déjà ouverte dans un autre onglet ou une autre fenêtre.
					</p>
					<button
						onClick={() => window.focus()}
						className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
					>
						Revenir à l’onglet existant
					</button>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default SingletonGuard;
