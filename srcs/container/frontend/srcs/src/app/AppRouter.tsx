import { Component } from 'react';
import { Routes, Route } from 'react-router-dom';


import WebSocketTest from './WebSocketTest';
import { Pong } from './pongGame/client'
import App from './App';

// PAGES

// ERROR PAGES

// JEUX

class AppRouter extends Component {

	render() {
		return (
			<Routes>

				<Route>
					<Route path="/" element={<App />} />
					<Route path="/pong" element={<Pong />} />
					<Route path="/WebSocketTest" element={<WebSocketTest />} />
				</Route>

			</Routes>
		);
	}
}

export default AppRouter;