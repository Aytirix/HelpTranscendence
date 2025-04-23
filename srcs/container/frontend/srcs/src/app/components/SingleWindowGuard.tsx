import React, { useEffect, useState, ReactNode } from 'react';

const CHANNEL_NAME = 'Trascendence';
const APP_WINDOW_NAME = 'TrascendenceApp';

type Message = 'HELLO' | 'OCCUPIED' | 'FOCUS';

interface SingletonGuardProps {
	children?: ReactNode;
}

const SingletonGuard: React.FC<SingletonGuardProps> = ({ children }) => {
	const [isPrimary, setIsPrimary] = useState<boolean | null>(null);
	const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));

	useEffect(() => {
		window.name = APP_WINDOW_NAME;

		let localIsPrimary = true;
		let decisionTaken = false;

		channel.onmessage = (ev: MessageEvent<Message>) => {
			switch (ev.data) {
				case 'HELLO':
					if (localIsPrimary && decisionTaken) {
						channel.postMessage('OCCUPIED');
					}
					break;
				case 'OCCUPIED':
					if (!decisionTaken) {
						localIsPrimary = false;
						setIsPrimary(false);
						decisionTaken = true;
					}
					break;
				case 'FOCUS':
					if (localIsPrimary) {
						window.focus();
					}
					break;
			}
		};

		channel.postMessage('HELLO');

		const to = setTimeout(() => {
			if (!decisionTaken) {
				setIsPrimary(localIsPrimary);
				decisionTaken = true;
			}
		}, 300);

		return () => {
			clearTimeout(to);
			channel.close();
		};
	}, [channel]);

	if (isPrimary === null) return null;

	if (!isPrimary) {
		return (
			<div className="h-screen flex items-center justify-center bg-red-50">
				<div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm mx-4">
					<h1 className="text-3xl font-extrabold text-red-600 mb-2">Oups !</h1>
					<p className="text-gray-700 mb-6">
						Cette application est déjà ouverte dans un autre onglet ou une autre fenêtre.
					</p>
					<button
						onClick={() => {
							channel.postMessage('FOCUS');
							window.close();
							setTimeout(() => {
								window.location.reload();
							}, 100);
						}}
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
