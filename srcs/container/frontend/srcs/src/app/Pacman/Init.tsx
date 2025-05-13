import React, { useEffect } from 'react';
import { useSafeWebSocket } from '../../api/useSafeWebSocket';
import { State } from './types';
import { CenteredBox } from './menu/CenteredBox';

function initState(): State {
	return {
		ws: null,
		statusws: 'Connecting...',
		rooms: {
			active: [],
			waiting: [],
		},
	};
}

export default function WebSocketPacman() {
	const stateRef = React.useRef<State>(initState());

	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'getrooms': {
				stateRef.current.rooms.waiting = data.waiting;
				stateRef.current.rooms.active = data.active;
				break;
			}
			default:
				console.log('Unknown action:', data.action);
				break;
		}
	};

	stateRef.current.ws = useSafeWebSocket({
		endpoint: '/Pacman',
		onMessage: handleMessage,
		onStatusChange: (status => {
			stateRef.current.statusws = status;
		}),
		reconnectDelay: 1000,
		pingInterval: 1000,
	});

	// Demander la liste des rooms à la connexion
	useEffect(() => {
		if (stateRef.current.ws && stateRef.current.ws.readyState === WebSocket.OPEN) {
			stateRef.current.ws.send(JSON.stringify({ action: 'getrooms' }));
		}
	}, [stateRef.current.ws]);

	return (
		<div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center">
			<h1 className="text-2xl font-bold mb-4">PACMAN</h1>
			<CenteredBox
				ws={stateRef.current.ws}
				statusws={stateRef.current.statusws}
				rooms={stateRef.current.rooms}
			/>
		</div>
	);
}
