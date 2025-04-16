import { useEffect, useState } from 'react';

const WebSocketTest = () => {
	const [status, setStatus] = useState('Connecting to WebSocket...');
	const [message, setMessage] = useState('');
	const [ws, setWs] = useState<WebSocket | null>(null);

	useEffect(() => {
		const socket = new WebSocket('wss://localhost:7000/ws');
		setWs(socket);

		socket.onopen = () => {
			console.log('WebSocket connected');
			setStatus('WebSocket connected!');
		};

		socket.onmessage = (event) => {
			console.log('Message received:', event.data);
			setMessage(`Message received: ${event.data}`);
		};

		socket.onclose = (event) => {
			console.log('Connexion WebSocket fermée. Code:', event.code, 'Raison:', event.reason);
			setStatus('WebSocket closed.');
		};

		socket.onerror = (error) => {
			setStatus('WebSocket error!');
			console.error('WebSocket error:', error);
		};

		return () => {
			socket.close();
		};
	}, []);

	const sendMessage = () => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send('Hello from client!');
			console.log('Message sent');
		} else {
			console.log('WebSocket not connected');
		}
	};

	return (
		<div>
			<h1>WebSocket Test Page</h1>
			<p>{status}</p>
			<div>
				<button onClick={sendMessage}>Send Message</button>
			</div>
			<div>
				<p>{message}</p>
			</div>
		</div>
	);
};

export default WebSocketTest;
