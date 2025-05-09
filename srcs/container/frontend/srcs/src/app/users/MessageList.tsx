// src/components/chat/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import Skeleton from './Skeleton';
import MessageItem from './MessageItem';

type Message = { id: number; sender_id: number; message: string; sent_at: Date };

type Props = {
  messages: Message[] | null;
  currentUserId: number | null;
  isLoading: boolean;
  onScroll: (atBottom: boolean) => void;
};

export default function MessageList({ messages, currentUserId, isLoading, onScroll }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const grouped = React.useMemo(() => {
    return messages?.reduce((acc: Record<string, Message[]>, msg) => {
      const date = msg.sent_at;
      const key = isToday(date) ? "Aujourd’hui"
        : isYesterday(date) ? 'Hier'
        : format(date, 'dd MMM yyyy');
      (acc[key] = acc[key] || []).push(msg);
      return acc;
    }, {}) || {};
  }, [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    onScroll(Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-15" />)}
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(grouped).map(([day, msgs]) => (
        <div key={day}>
          <div className="text-center text-gray-500 my-2">{day}</div>
          {msgs.map((msg) => (
            <MessageItem key={msg.id} message={msg.message} sentAt={format(msg.sent_at, 'HH:mm')} sender={msg.sender_id === currentUserId ? 'Vous' : 'Autre utilisateur'} isOwnMessage={msg.sender_id === currentUserId} />
          ))}
        </div>
      ))}
    </div>
);
}
