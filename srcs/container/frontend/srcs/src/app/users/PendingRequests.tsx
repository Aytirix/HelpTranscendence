// src/components/chat/PendingRequests.tsx
import React from 'react';
import { User } from './GroupList';
import Avatar from './Avatar';

type Props = {
  requests: User[];
  onAccept: (user: User) => void;
  onRefuse: (user: User) => void;
  onCancel: (user: User) => void;
};

export default function PendingRequests({
  requests,
  onAccept,
  onRefuse,
  onCancel,
}: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Demandes en attente</h2>
      {requests.length > 0 ? (
        requests.map((u) => (
          <div key={u.id} className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Avatar src={(u as any).avatar || null} alt={u.username} />
              <span className="ml-3 font-medium">{u.username}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onAccept(u)}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Accepter
              </button>
              <button
                onClick={() => onRefuse(u)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Refuser
              </button>
              <button
                onClick={() => onCancel(u)}
                className="px-3 py-1 bg-yellow-500 text-white rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500">Aucune demande en attente</p>
      )}
    </div>
  );
}
