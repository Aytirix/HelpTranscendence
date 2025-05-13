import React from 'react';
import CenteredBox from './CenteredBox';
interface Player {
  id: number;
  username: string;
}

interface Room {
  id: number;
  owner_id: number;
  players: Player[];
  state: string;
}

interface RoomListProps {
  waitingRooms: Room[];
  activeRooms: Room[];
}

const RoomList: React.FC<RoomListProps> = ({ waitingRooms, activeRooms }) => {
  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-md w-full max-w-3xl">
	<CenteredBox />
      <h2 className="text-3xl font-bold mb-4">Rooms</h2>
      
      <h3 className="text-xl font-semibold">Waiting Rooms</h3>
      {waitingRooms.length === 0 ? (
        <p className="text-gray-400">No waiting rooms available</p>
      ) : (
        <div className="space-y-3">
          {waitingRooms.map((room) => (
            <div key={room.id} className="p-3 bg-gray-700 rounded">
              <p>ID: {room.id} | Owner: {room.owner_id}</p>
              <p>Players: {room.players.map((p) => p.username).join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-xl font-semibold mt-6">Active Rooms</h3>
      {activeRooms.length === 0 ? (
        <p className="text-gray-400">No active rooms available</p>
      ) : (
        <div className="space-y-3">
          {activeRooms.map((room) => (
            <div key={room.id} className="p-3 bg-gray-700 rounded">
              <p>ID: {room.id} | Owner: {room.owner_id}</p>
              <p>Players: {room.players.map((p) => p.username).join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
