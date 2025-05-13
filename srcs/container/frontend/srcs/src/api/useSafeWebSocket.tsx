import { useEffect, useRef } from 'react';

const url = `wss://${window.location.hostname}:7000`;

export type WebSocketStatus = 'Connecting...' | 'Connected' | 'Closed' | 'Error' | 'Reconnecting';

export interface SafeWebSocketProps {
	endpoint: string;
	onMessage: (data: any) => void;
	onStatusChange?: (status: WebSocketStatus) => void;
	reconnectDelay?: number;  // en ms, ex: 3000ms = 3 secondes
	maxReconnectAttempts?: number; // Nombre maximum de tentatives de reconnexion
	pingInterval?: number; // Délai entre les ping, en ms
}

export function useSafeWebSocket({ endpoint, onMessage, onStatusChange, reconnectDelay = 3000, maxReconnectAttempts = 5, pingInterval = 50000 }: SafeWebSocketProps): WebSocket | null {
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const isManuallyClosed = useRef(false);

	const setupWebSocket = () => {
		if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING || reconnectAttemptsRef.current >= maxReconnectAttempts) {
			return;
		}

		const socket = new WebSocket(`${url}${endpoint}`);
		socketRef.current = socket;
		onStatusChange?.('Connecting...');

		socket.onopen = () => {
			reconnectAttemptsRef.current = 0;
			onStatusChange?.('Connected');
			heartbeatRef.current = setInterval(() => {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ action: 'ping' }));
				}
			}, pingInterval);
		};

		socket.onmessage = (evt) => {
			try {
				const data = JSON.parse(evt.data);
				onMessage(data);
			} catch {
				console.error('WS parse error :', evt.data);
			}
		};

		socket.onclose = () => handleCloseOrError('Closed');
		socket.onerror = () => handleCloseOrError('Error');
	};

	const handleCloseOrError = (type: 'Closed' | 'Error') => {
		clearInterval(heartbeatRef.current!);
		if (isManuallyClosed.current) return;

		if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
			onStatusChange?.(type);
		} else {
			onStatusChange?.('Reconnecting');
			reconnectAttemptsRef.current++;
			reconnectTimeoutRef.current = setTimeout(setupWebSocket, reconnectDelay);
		}
	};

	useEffect(() => {
		setupWebSocket();
		window.addEventListener('beforeunload', () => {
			isManuallyClosed.current = true;
			clearInterval(heartbeatRef.current!);
			socketRef.current?.close();
		});
		return () => {
			isManuallyClosed.current = true;
			clearInterval(heartbeatRef.current!);
			reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
			socketRef.current?.close();
			window.removeEventListener('beforeunload', () => { });
		};
	}, [endpoint]);

	return socketRef.current;
}

export default useSafeWebSocket;