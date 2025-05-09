// src/components/chat/BlockedList.tsx
import React from 'react';
import { User } from './GroupList';
import Avatar from './Avatar';

type Props = {
  blocked: User[];
  onUnblock: (user: User) => void;
};

export default function BlockedList({ blocked, onUnblock }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Utilisateurs bloqués</h2>
      {blocked.length > 0 ? (
        blocked.map((u) => (
          <div key={u.id} className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Avatar src={(u as any).avatar || null} alt={u.username} />
              <span className="ml-3 font-medium">{u.username}</span>
            </div>
            <button
              onClick={() => onUnblock(u)}
              className="px-3 py-1 bg-green-500 text-white rounded"
            >
              Débloquer
            </button>
          </div>
        ))
      ) : (
        <p className="text-gray-500">Aucun utilisateur bloqué</p>
      )}
    </div>
  );
}
