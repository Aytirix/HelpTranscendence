import React from 'react';
import { State, Player, Room } from '../types';

const WaitingRooms: React.FC<{ state: State }> = ({state}) => {
	const [roomName, setRoomName] = React.useState('');

	const handleCreateRoom = () => {
		if (roomName.trim()) {
			console.log('ws', state.ws);
			state.ws?.send(
				JSON.stringify({
					action: 'createRoom',
					name: roomName,
				}),
			);
		}
		// setRoomName('');
	}

	return (
		<div className="p-6 bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
			<h2 className="text-xl font-semibold">Parties en attente</h2>
			<div className="mb-4">
				<input
					type="text"
					placeholder="Nom de la salle"
					value={roomName}
					onChange={(e) => setRoomName(e.target.value)}
					className="p-2 rounded bg-gray-700 text-white"
				/>
				<button
					onClick={handleCreateRoom}
					className="mt-2 p-2 bg-blue-600 rounded text-white w-full"
				>
					Créer une salle
				</button>
			</div>
			{state.rooms.waiting.length === 0 ? (
				<p className="text-gray-400">Aucune salle d'attente disponible.</p>
			) : (
				<div className="space-y-3">
					{state.rooms.waiting.map((room: Room) => (
						<div key={room.id} className="p-3 bg-gray-700 rounded">
							<p>name: {room.name}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default WaitingRooms;
