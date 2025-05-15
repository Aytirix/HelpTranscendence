import React from 'react';
import { state, room } from '../../types/pacmanTypes';

const ActiveRooms: React.FC<{ state: state }> = ({state}) => {
	return (
		<div className="p-6 bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
			<h2 className="text-xl font-semibold">Partie en cours</h2>
			{state.rooms.active.length === 0 ? (
				<p className="text-gray-400">Aucune partie en cours</p>
			) : (
				<div className="space-y-3">
					{state.rooms.active.map((room: room) => (
						<div key={room.id} className="p-3 bg-gray-700 rounded">
							<p>ID: {room.id} | Owner: {room.owner_id}</p>
							<p>{room.numberOfPlayers} / 5</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default ActiveRooms;
