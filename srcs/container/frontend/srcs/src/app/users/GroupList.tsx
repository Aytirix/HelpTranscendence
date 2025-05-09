// src/components/chat/GroupList.tsx
import React from 'react';

export type User = {
  id: number;
  username: string;
};

export type Group = {
  id: number;
  name: string;
  members: User[];
  private: 0 | 1;
};

type Props = {
  groups: Group[];
  activeId: number | null;
  onSelect: (id: number) => void;
  currentUserId: number | null;
};

export default function GroupList({ groups, activeId, onSelect, currentUserId }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Mes discussions</h2>
      {groups.length > 0 ? (
        groups.map((g) => {
          let label = g.name;
          if (g.private === 1 && currentUserId != null) {
            const other = g.members.find((m) => m.id !== currentUserId);
            if (other) label = other.username;
          }
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-shadow ${
                g.id === activeId
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className="text-sm text-gray-500 ml-2">({g.members.length})</span>
            </button>
          );
        })
      ) : (
        <p className="text-gray-500">Aucune discussion</p>
      )}
    </div>
  );
}
