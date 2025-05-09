// src/components/chat/ChatHeader.tsx
import React from 'react';
import { useTheme } from './WebSocketChat';

type Props = {
  title: string;
  status: string;
  duration: string;
};

export default function ChatHeader({ title, status, duration }: Props) {
  const { dark, toggle } = useTheme();

  return (
    <header className={`p-4 flex justify-between items-center border-b
      ${dark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
      <h2 className="text-2xl font-semibold truncate max-w-xs">{title}</h2>
      <div className="flex items-center space-x-4">
        <button onClick={toggle} aria-label="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>
        <span className={`px-3 py-1 rounded-full text-sm
          ${status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status}
        </span>
        <span className="text-gray-500">{duration}</span>
      </div>
    </header>
  );
}
