import React, { useEffect, useState } from 'react';
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
	const [state, setState] = useState<State>(initState());

	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'getrooms': {
				setState((prevState: State) => ({
					...prevState,
					rooms: {
						waiting: data.waiting,
						active: data.active,
					},
				}));
				break;
			}
			default:
				console.log('Unknown action:', data.action);
				break;
		}
	};

	const websocket = useSafeWebSocket({
		endpoint: '/Pacman',
		onMessage: handleMessage,
		onStatusChange: (status) => {
			setState((prevState) => ({ ...prevState, statusws: status }));
		},
		reconnectDelay: 1000,
		pingInterval: 1000,
	});

	useEffect(() => {
		setState((prevState) => ({
			...prevState,
			ws: websocket,
		}));

		return () => {
			websocket?.close();
		};
	}, [websocket]);

	return (
		<>
			<h1 className="text-3xl font-bold text-center text-white mb-4 justify-center">PACMAN</h1>
			<div className="bg-gray-900 text-white flex flex-col items-center justify-center">
				<CenteredBox state={state} />
			</div>
		</>
	);
}
