// src/components/chat/MessageInput.tsx
import React from 'react';
import { Send } from 'lucide-react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
};

export default function MessageInput({ value, onChange, onSend }: Props) {
  return (
    <div className="p-4 border-t flex items-center space-x-3 bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tapez un message..."
        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Message input"
        onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
      />
      <button
        onClick={onSend}
        disabled={!value.trim()}
        className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-50"
      >
        <Send />
      </button>
    </div>
  );
}
 