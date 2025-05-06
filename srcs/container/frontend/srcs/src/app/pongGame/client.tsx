import React, { useEffect, useRef, useState } from 'react';

interface Parse {
	ball: {
		pos_x: number;
		pos_y: number;
		d_x: number;
		d_y: number;
		readonly speed: number;
		readonly radius: number;
	};
	player1: {
		pos_x: number;
		pos_y: number;
		userName: string;
		readonly height: number;
		readonly width: number;
		readonly margin: number;
		readonly speed: number;
		score: number;
	};
	player2: {
		pos_x: number;
		pos_y: number;
		userName: string;
		readonly height: number;
		readonly width: number;
		readonly margin: number;
		readonly speed: number;
		score: number;
	};
}

export const Pong: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const [parsedData, setParsedData] = useState<Parse | null>(null);
	const [mode, setMode] = useState<"SameKeyboard" | "Solo" | "Multi" | "EXIT" | null>(null);
	const [whoAmI, setWhoAmI] = useState<"player1" | "player2" | null>(null);
	const [resetView, setResetView] = useState(false); // ✅ état ajouté

	const keyPressed = useRef({
		up_p1: false,
		down_p1: false,
		up_p2: false,
		down_p2: false,
	});

	useEffect(() => {
		const socket = new WebSocket(`wss://${window.location.hostname}:7000/pong`);
		socketRef.current = socket;

		const handleSocketClose = () => {
			console.log("❌ WebSocket fermée : suppression pongMode");
			localStorage.removeItem('pongMode');
		};

		const handleUnload = () => {
			console.log("💨 Fermeture de l’onglet : suppression pongMode");
			localStorage.removeItem('pongMode');
		};

		socket.addEventListener('open', () => {
			console.log('✅ Connexion établie');

			const savedMode = localStorage.getItem('pongMode') as "SameKeyboard" | "Solo" | "Multi" | "EXIT" | null;
			if (savedMode && savedMode !== "EXIT") {
				socket.send(JSON.stringify({ type: savedMode }));
				setMode(savedMode);
			}
		});

		socket.addEventListener('message', (event: MessageEvent) => {
			const str = event.data;
			try {
				const json = JSON.parse(str);

				if (json.type === "assign") {
					setWhoAmI(json.value);
					console.log('🧠 Assigné :', json.value);
					return;
				}
				if (json.type === "EXIT") {
					localStorage.removeItem('pongMode');
					setMode("EXIT");
					console.log("🎉 Partie terminée !");
					return;
				}
				if (json.type === "reset") {
					setResetView(true); // ✅ active l'effacement visuel
					console.log("🔁 Affichage réinitialisé !");
					return;
				}
				if (json.type === "SameKeyboard" || json.type === "Multi") {
					setMode(json.type);
					return;
				}
				setResetView(false); // ✅ désactive le mode reset si on reçoit des données normales
				setParsedData(json);
			} catch {
				console.log('📨 Réponse serveur :', str);
			}
		});

		socket.addEventListener('close', handleSocketClose);
		window.addEventListener('beforeunload', handleUnload);

		return () => {
			socket.removeEventListener('close', handleSocketClose);
			window.removeEventListener('beforeunload', handleUnload);
			socket.close();
		};
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');

		if (!canvas || !ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.closePath();

		if (parsedData && !resetView) {
			ctx.fillStyle = 'black';
			ctx.fillRect(parsedData.player1.pos_x, parsedData.player1.pos_y, parsedData.player1.width, parsedData.player1.height);
			ctx.fillRect(parsedData.player2.pos_x, parsedData.player2.pos_y, parsedData.player2.width, parsedData.player2.height);
			ctx.beginPath();
			ctx.fillStyle = 'red';
			ctx.arc(parsedData.ball.pos_x, parsedData.ball.pos_y, 10, 0, Math.PI * 2);
			ctx.fill();
		}
	}, [parsedData, resetView]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (mode === "EXIT") return;

			if (e.key === 'ArrowUp') {
				keyPressed.current.up_p1 = true;
				console.log(`keydown ${e.key}`);
			}
			if (e.key === 'ArrowDown') keyPressed.current.down_p1 = true;
			if (e.key === 'w') keyPressed.current.up_p2 = true;
			if (e.key === 's') keyPressed.current.down_p2 = true;
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (mode === "EXIT") return;

			if (e.key === 'ArrowUp') keyPressed.current.up_p1 = false;
			if (e.key === 'ArrowDown') keyPressed.current.down_p1 = false;
			if (e.key === 'w') keyPressed.current.up_p2 = false;
			if (e.key === 's') keyPressed.current.down_p2 = false;

		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		const interval = setInterval(() => {
			const socket = socketRef.current;
			if (!socket || socket.readyState !== WebSocket.OPEN || !mode || mode === "EXIT") return;
			console.log(`SameKeyboard '${mode}'`);
			if (mode === "SameKeyboard") {
				if (keyPressed.current.up_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p1_up' }));
				else if (keyPressed.current.down_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p1_down' }));

				if (keyPressed.current.up_p2) socket.send(JSON.stringify({ type: 'Move', value: 'p2_up' }));
				else if (keyPressed.current.down_p2) socket.send(JSON.stringify({ type: 'Move', value: 'p2_down' }));
			} else if (mode === "Multi" && whoAmI) {
				if (whoAmI === "player1") {
					if (keyPressed.current.up_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p1_up' }));
					else if (keyPressed.current.down_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p1_down' }));
				} else if (whoAmI === "player2") {
					if (keyPressed.current.up_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p2_up' }));
					else if (keyPressed.current.down_p1) socket.send(JSON.stringify({ type: 'Move', value: 'p2_down' }));
				}
			}
		}, 1000 / 60);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			clearInterval(interval);
		};
	}, [mode, whoAmI]);

	useEffect(() => {
		const interval = setInterval(() => {
			const socket = socketRef.current;
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: 'Ping' }));
			}
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	function sendMode(selectedMode: "SameKeyboard" | "Solo" | "Multi" | "EXIT") {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		localStorage.setItem('pongMode', selectedMode);
		setMode(selectedMode);
		socket.send(JSON.stringify({ type: selectedMode }));
	}

	return (
		<div>
			<canvas
				ref={canvasRef}
				width={800}
				height={600}
				style={{ border: '2px solid black', display: 'block', margin: '0 auto' }}
			/>
			{mode === "EXIT" && (
				<div style={{ textAlign: 'center', fontSize: '24px', marginTop: '20px', color: 'red' }}>
					🎉 Partie terminée !
				</div>
			)}
			<div style={{ textAlign: 'center', marginTop: '10px' }}>
				<button onClick={() => sendMode("SameKeyboard")}>Same Keyboard</button>
				<button onClick={() => sendMode("Solo")}>Solo</button>
				<button onClick={() => sendMode("Multi")}>Multi</button>
				<button onClick={() => sendMode("EXIT")}>EXIT</button>
			</div>
		</div>
	);
};

export default Pong;