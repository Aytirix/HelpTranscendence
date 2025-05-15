import { useEffect, useState } from 'react';
import { useSafeWebSocket } from '../../api/useSafeWebSocket';
import { state } from '../types/pacmanTypes';
import { CenteredBox } from './menu/CenteredBox';
import { useAuth } from '../../contexts/AuthContext';

function initState(): state {
	return {
		ws: null,
		statusws: 'Connecting...',
		player: useAuth().user,
		rooms: {
			active: [],
			waiting: [],
		},
	};
}

export default function WebSocketPacman() {
	const [state, setState] = useState<state>(initState());

	const handleMessage = (data: any) => {
		switch (data.action) {
			case 'getrooms': {
				setState((prevState: state) => ({
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
		<div className="bg-gray-200 text-white flex flex-col items-center justify-center">
			<CenteredBox state={state} />
		</div>
	);
}
