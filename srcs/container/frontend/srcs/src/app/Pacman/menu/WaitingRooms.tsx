import React from 'react';
import { state } from '@types/pacmanTypes';
import '../../assets/styles/pacman/WaitingRooms.scss';

interface WaitingRoomsProps {
	state: state;
}

const WaitingRooms: React.FC<WaitingRoomsProps> = ({ state }) => {
	const [roomName, setRoomName] = React.useState('');

	const handleCreateRoom = () => {
		if (roomName.trim()) {
			state.ws?.send(JSON.stringify({ action: 'createRoom', name: roomName }));
			setRoomName('');
		}
	};

	const handleJoinRoom = (roomId: number) => {
		state.ws?.send(JSON.stringify({ action: 'joinRoom', room_id: roomId }));
	};

	const handleKick = (roomId: number, userId: number) => {
		state.ws?.send(JSON.stringify({ action: 'kickRoom', room_id: roomId, user_id: userId }));
	};

	const handleSetOwner = (roomId: number, userId: number) => {
		state.ws?.send(JSON.stringify({ action: 'setOwner', room_id: roomId, user_id: userId }));
	};

	const handleLeave = (roomId: number) => {
		state.ws?.send(JSON.stringify({ action: 'leaveRoom', room_id: roomId }));
	};

	const handleLaunch = (roomId: number) => {
		state.ws?.send(JSON.stringify({ action: 'launchRoom', room_id: roomId }));
	};

	// Vérifier si l'utilisateur est déjà dans une salle d'attente
	const currentRoom = state.rooms.waiting.find(r =>
		r.players?.some(p => p.id === state.player?.id)
	);
	console.log('state.rooms.waiting', state.rooms.waiting);
	console.log('currentRoom', currentRoom);
	console.log('state.player', state.player);
	const isOwner = currentRoom?.owner_id === state.player?.id;

	return (
		<div className="waiting-rooms">
			{!currentRoom ? (
				// Liste des rooms à rejoindre
				<>
					<div className="create-room">
						<input
							type="text"
							placeholder="Nom de la salle"
							value={roomName}
							onChange={e => setRoomName(e.target.value)}
						/>
						<button onClick={handleCreateRoom}>Créer une salle</button>
					</div>
					{state.rooms.waiting.length === 0 ? (
						<p className="no-room">Aucune salle d'attente disponible.</p>
					) : (
						<div className="rooms-list">
							{state.rooms.waiting.map(r => (
								<div key={r.id} className="room-item">
									<span className="room-name">{r.name}</span>
									<span className="room-count">
										{r.players?.length} / 5
									</span>
									<button
										className="join-btn"
										onClick={() => handleJoinRoom(r.id)}
									>
										Rejoindre
									</button>
								</div>
							))}
						</div>
					)}
				</>
			) : (
				// Affichage de la salle actuelle
				<div className="room-card">
					<h2 className="room-title">{currentRoom.name}</h2>
					<p className="room-owner">Propriétaire: {currentRoom.owner_username}</p>

					<div className="players-list">
						{Array.from({ length: 5 }).map((_, idx) => {
							const player = currentRoom.players?.[idx];
							return (
								<div key={idx} className="player-slot">
									{player ? (
										<>
											<span className="player-name">{player.username}</span>
											{isOwner && player.id !== currentRoom.owner_id && (
												<button
													className="kick-btn"
													onClick={() => handleKick(currentRoom.id, player.id)}
												>
													×
												</button>
											)}
											{isOwner && player.id !== currentRoom.owner_id && (
												<button
													className="promote-btn"
													onClick={() => handleSetOwner(currentRoom.id, player.id)}
												>
													↑
												</button>
											)}
										</>
									) : (
										<span className="waiting-slot">En attente d'un joueur</span>
									)}
								</div>
							);
						})}
					</div>

					<div className="room-actions">
						<button
							className="leave-btn"
							onClick={() => handleLeave(currentRoom.id)}
						>
							Quitter la salle
						</button>
						{isOwner && (
							<button
								className="launch-btn"
								onClick={() => handleLaunch(currentRoom.id)}
							>
								Lancer la partie
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default WaitingRooms;
