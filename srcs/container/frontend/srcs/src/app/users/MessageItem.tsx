import React from 'react';

interface MessageProps {
  sender: string;
  message: string;
  sentAt: string;
  isOwnMessage: boolean;
}

export default function MessageItem({ sender, message, sentAt, isOwnMessage }: MessageProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs p-2 rounded-lg shadow-md ${
          isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
        }`}
      >
        {!isOwnMessage && <span className="block font-semibold">{sender}</span>}
        <p>{message}</p>
        <span className="text-xs text-gray-500">{new Date(sentAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
