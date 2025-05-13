import React from 'react';
import { Player, ListRooms, Room } from '../types';

const WaitingRooms: React.FC<ListRooms> = ({ rooms }) => {
	return (
		<div className="p-6 bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
			<h2 className="text-3xl font-bold mb-4">Rooms</h2>

			<h3 className="text-xl font-semibold">Waiting Rooms</h3>
			{rooms.length === 0 ? (
				<p className="text-gray-400">No waiting rooms available</p>
			) : (
				<div className="space-y-3">
					{rooms.map((room: Room) => (
						<div key={room.id} className="p-3 bg-gray-700 rounded">
							<p>ID: {room.id} | Owner: {room.owner_id}</p>
							<p>Players: {room.players.map((p: Player) => p.username).join(', ')}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default WaitingRooms;
