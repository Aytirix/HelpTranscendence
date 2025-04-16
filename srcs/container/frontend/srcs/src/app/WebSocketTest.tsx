import { useEffect, useState } from 'react';

const WebSocketTest = () => {
	const [status, setStatus] = useState('Connecting to WebSocket...');
	const [messages, setMessages] = useState<string[]>([]);
	const [input, setInput] = useState('');
	const [ws, setWs] = useState<WebSocket | null>(null);

	useEffect(() => {
		const socket = new WebSocket('wss://localhost:7000/ws/chat');
		setWs(socket);

		socket.onopen = () => {
			console.log('WebSocket connected');
			setStatus('WebSocket connected!');
		};

		socket.onmessage = (event) => {
			console.log('Message received:', event.data);
			setMessages(prev => [...prev, `Server: ${event.data}`]);
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
			ws.send(input);
			setMessages(prev => [...prev, `You: ${input}`]);
			setInput('');
		} else {
			console.error('WebSocket is not open. Message not sent.');
		}
	};

	return (
		<div style={{ padding: '1rem' }}>
			<h1>WebSocket Test Page</h1>
			<p>Status: {status}</p>

			<div style={{ marginBottom: '1rem' }}>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type your message..."
					style={{ marginRight: '0.5rem' }}
				/>
				<button onClick={sendMessage}>Send</button>
			</div>

			<div style={{ border: '1px solid #ccc', padding: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
				<h3>Message Log:</h3>
				{messages.length === 0 && <p>No messages yet.</p>}
				<ul>
					{messages.map((msg, index) => (
						<li key={index}>{msg}</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default WebSocketTest;
