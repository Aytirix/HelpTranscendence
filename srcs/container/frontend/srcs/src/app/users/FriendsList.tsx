// src/components/chat/FriendsList.tsx
import React from 'react';
import { User } from './GroupList';
import Avatar from './Avatar';

type Props = {
  friends: User[];
  currentUserId: number | null;
  onAction: (user: User, action: string) => void;
};

export default function FriendsList({ friends, currentUserId, onAction }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Liste d'amis</h2>
      {friends.length > 0 ? (
        friends.map((u) => {
          const rel = (u as any).relation;
          let buttons: React.ReactNode = null;

          if (rel) {
            if (rel.status === 'pending' && rel.target !== currentUserId) {
              buttons = (
                <button
                  onClick={() => onAction(u, 'cancel_request')}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  Annuler
                </button>
              );
            } else if (rel.status === 'pending' && rel.target === currentUserId) {
              buttons = (
                <>
                  <button
                    onClick={() => onAction(u, 'accept_friend')}
                    className="px-3 py-1 bg-green-500 text-white rounded mr-2"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => onAction(u, 'refuse_friend')}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Refuser
                  </button>
                </>
              );
            } else if (rel.status === 'friend') {
              buttons = (
                <>
                  <button
                    onClick={() => onAction(u, 'message')}
                    className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => onAction(u, 'remove_friend')}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Retirer
                  </button>
                </>
              );
            }
          } else {
            buttons = (
              <>
                <button
                  onClick={() => onAction(u, 'send_request')}
                  className="px-3 py-1 bg-blue-500 text-white rounded mr-2"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => onAction(u, 'block')}
                  className="px-3 py-1 bg-red-500 text-white rounded"
                >
                  Bloquer
                </button>
              </>
            );
          }

          return (
            <div key={u.id} className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Avatar src={(u as any).avatar || null} alt={u.username} />
                <span className="ml-3 font-medium">{u.username}</span>
              </div>
              <div className="flex space-x-2">{buttons}</div>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500">Aucun ami</p>
      )}
    </div>
);
}
